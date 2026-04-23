import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_TASKS_API = 'https://tasks.googleapis.com/tasks/v1'
const CLIENT_ID = '83074924250-g7qivb86nqkkjndi5ri1gjsqk4bps4lh.apps.googleusercontent.com'
const CLIENT_SECRET = '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'

Deno.serve(async (req) => {
  // Only allow calls authenticated with the service role key
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )

  // Fetch all mappings across all families
  const { data: allMappings, error: mapErr } = await supabase
    .from('google_task_mappings')
    .select('id, family_id, child_id, google_tasklist_id, google_tasklist_title, default_reward')

  if (mapErr || !allMappings || allMappings.length === 0) {
    return new Response(JSON.stringify({ message: 'No mappings to sync' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Group mappings by family
  const byFamily = new Map<string, typeof allMappings>()
  for (const m of allMappings) {
    if (!byFamily.has(m.family_id)) byFamily.set(m.family_id, [])
    byFamily.get(m.family_id)!.push(m)
  }

  const results: Array<{ familyId: string; synced: number; errors: string[] }> = []

  for (const [familyId, mappings] of byFamily) {
    // Find a parent in this family who has a connected Google account
    const { data: parents } = await supabase
      .from('users')
      .select('id')
      .eq('family_id', familyId)
      .eq('role', 'parent')

    let accessToken: string | null = null

    for (const parent of parents ?? []) {
      const { data: tokenRow } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', parent.id)
        .maybeSingle()

      if (!tokenRow) continue

      const expiresAt = new Date(tokenRow.expires_at).getTime()
      const now = Date.now()

      if (expiresAt - now < 5 * 60 * 1000) {
        // Token expiring soon — refresh it
        if (!tokenRow.refresh_token) {
          await supabase.from('google_tokens').delete().eq('id', tokenRow.id)
          continue
        }

        const resp = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: tokenRow.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}))
          if (body.error === 'invalid_grant') {
            await supabase.from('google_tokens').delete().eq('id', tokenRow.id)
          }
          continue
        }

        const refreshed = await resp.json()
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        await supabase
          .from('google_tokens')
          .update({ access_token: refreshed.access_token, expires_at: newExpiry })
          .eq('id', tokenRow.id)

        accessToken = refreshed.access_token
      } else {
        accessToken = tokenRow.access_token
      }

      break // found a valid token for this family
    }

    if (!accessToken) {
      results.push({ familyId, synced: 0, errors: ['No valid Google token for this family'] })
      continue
    }

    let synced = 0
    const errors: string[] = []

    for (const mapping of mappings) {
      try {
        const tasksResp = await fetch(
          `${GOOGLE_TASKS_API}/lists/${mapping.google_tasklist_id}/tasks?maxResults=100&showCompleted=true&showHidden=true`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!tasksResp.ok) throw new Error(`Tasks API ${tasksResp.status}`)

        const tasksData = await tasksResp.json()
        const tasks: Array<Record<string, string>> = tasksData.items ?? []

        for (const task of tasks) {
          if (!task.title?.trim()) continue

          const { data: existing } = await supabase
            .from('chores')
            .select('id, status, value')
            .eq('google_task_id', task.id)
            .eq('family_id', familyId)
            .maybeSingle()

          if (existing) {
            const updates: Record<string, unknown> = {}
            if (task.status === 'completed' && existing.status === 'assigned') {
              updates.status = 'done'
            }
            const storedValue = parseFloat(existing.value)
            if (Math.abs(storedValue - mapping.default_reward) > 0.001) {
              updates.value = mapping.default_reward
            }
            if (Object.keys(updates).length > 0) {
              await supabase.from('chores').update(updates).eq('id', existing.id)
              synced++
            }
          } else {
            let reward = mapping.default_reward
            if (task.notes) {
              const match = task.notes.match(/\$(\d+(?:\.\d{1,2})?)/)
              if (match?.[1]) {
                const parsed = parseFloat(match[1])
                if (!isNaN(parsed)) reward = parsed
              }
            }

            const { error: insertErr } = await supabase.from('chores').insert({
              family_id: familyId,
              assigned_to_child_id: mapping.child_id,
              title: task.title,
              value: reward,
              status: task.status === 'completed' ? 'done' : 'assigned',
              due_date: task.due ? task.due.split('T')[0] : null,
              source: 'google_tasks',
              google_task_id: task.id,
              is_recurring: false,
            })

            if (insertErr) {
              errors.push(`"${task.title}": ${insertErr.message}`)
            } else {
              synced++
            }
          }
        }

        await supabase
          .from('google_task_mappings')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', mapping.id)
      } catch (e: unknown) {
        errors.push(`"${mapping.google_tasklist_title}": ${(e as Error).message}`)
      }
    }

    results.push({ familyId, synced, errors })
  }

  console.log('Nightly sync complete:', JSON.stringify(results))
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
