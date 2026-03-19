import { supabase } from '@/lib/supabase';
import { fetchTasks, refreshAccessToken } from '@/lib/googleTasks';
import type { GoogleTaskMapping, GoogleToken } from '@/types/database';

/**
 * Get a valid access token, refreshing if expired.
 */
async function getValidToken(token: GoogleToken): Promise<string> {
  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  // Refresh if expiring within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    if (!token.refresh_token) {
      throw new Error('No refresh token stored. Please reconnect your Google account.');
    }
    const refreshed = await refreshAccessToken(token.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await supabase
      .from('google_tokens')
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', token.id);

    return refreshed.access_token;
  }

  return token.access_token;
}

/**
 * Retrieve a valid access token for the given user (refreshes if needed).
 * Used by the UI to load task lists without repeating the full OAuth flow.
 */
export async function getValidAccessTokenForUser(userId: string): Promise<string> {
  const { data: tokenData, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) throw new Error('Google account not connected.');
  return getValidToken(tokenData as GoogleToken);
}



/**
 * Sync all mapped Google Task Lists for a family.
 * Creates new chores for new tasks, marks existing chores as "done" when tasks are completed.
 */
export async function syncTasksForFamily(
  userId: string,
  familyId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  // 1. Get the user's Google token
  const { data: tokenData, error: tokenError } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (tokenError || !tokenData) {
    return { synced: 0, errors: ['Google account not connected.'] };
  }

  let accessToken: string;
  try {
    accessToken = await getValidToken(tokenData as GoogleToken);
  } catch (e: any) {
    return { synced: 0, errors: [`Token refresh failed: ${e.message}`] };
  }

  // 2. Get all mappings for this family
  const { data: mappings, error: mappingError } = await supabase
    .from('google_task_mappings')
    .select('*')
    .eq('family_id', familyId);

  if (mappingError || !mappings || mappings.length === 0) {
    return { synced: 0, errors: mappingError ? [mappingError.message] : ['No task lists mapped.'] };
  }

  // 3. For each mapping, fetch tasks and sync
  for (const mapping of mappings as GoogleTaskMapping[]) {
    try {
      const tasks = await fetchTasks(accessToken, mapping.google_tasklist_id, true);

      for (const task of tasks) {
        if (!task.title || task.title.trim() === '') continue;

        // Check if this task is already synced
        const { data: existingChore } = await supabase
          .from('chores')
          .select('id, status')
          .eq('google_task_id', task.id)
          .eq('family_id', familyId)
          .maybeSingle();

        if (existingChore) {
          // Task exists — update status if completed in Google
          if (task.status === 'completed' && existingChore.status === 'assigned') {
            await supabase
              .from('chores')
              .update({ status: 'done' })
              .eq('id', existingChore.id);
            synced++;
          }
        } else {
          // New task — create chore
          const choreStatus = task.status === 'completed' ? 'done' : 'assigned';
          const { error: insertError } = await supabase
            .from('chores')
            .insert({
              family_id: familyId,
              assigned_to_child_id: mapping.child_id,
              title: task.title,
              value: mapping.default_reward,
              status: choreStatus,
              due_date: task.due ? task.due.split('T')[0] : null,
              source: 'google_tasks',
              google_task_id: task.id,
              is_recurring: false,
              recurrence_period: null,
            });

          if (insertError) {
            errors.push(`Failed to sync "${task.title}": ${insertError.message}`);
          } else {
            synced++;
          }
        }
      }

      // Update last_synced_at
      await supabase
        .from('google_task_mappings')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', mapping.id);

    } catch (e: any) {
      errors.push(`Error syncing "${mapping.google_tasklist_title}": ${e.message}`);
    }
  }

  return { synced, errors };
}
