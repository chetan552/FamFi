import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

interface GoogleTask {
  id: string
  title?: string
  status?: string
  notes?: string
  due?: string
  deleted?: boolean
}

interface Mapping {
  id: string
  family_id: string
  child_id: string
  google_tasklist_id: string
  google_tasklist_title: string
  default_reward: number | string
  created_by_user_id: string | null
}

interface TokenRow {
  id: string
  user_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string
}

Deno.serve(async (req) => {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!serviceRoleKey || !supabaseUrl || !clientId || !clientSecret) {
    console.error('sync-google-tasks misconfigured: missing required env vars')
    return new Response('Server misconfigured', { status: 500 })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: allMappings, error: mapErr } = await supabase
    .from('google_task_mappings')
    .select('id, family_id, child_id, google_tasklist_id, google_tasklist_title, default_reward, created_by_user_id')

  if (mapErr) {
    console.error('Failed to load mappings:', mapErr)
    return new Response(JSON.stringify({ error: mapErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!allMappings || allMappings.length === 0) {
    return new Response(JSON.stringify({ message: 'No mappings to sync' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const mappings = allMappings as Mapping[]

  // Group by family for fallback token lookup, but resolve tokens per-mapping.
  const familyParents = new Map<string, string[]>()
  for (const m of mappings) {
    if (!familyParents.has(m.family_id)) {
      const { data: parents } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', m.family_id)
        .eq('role', 'parent')
      familyParents.set(m.family_id, (parents ?? []).map((p: { id: string }) => p.id))
    }
  }

  // Cache resolved access tokens per user so we don't refresh twice in one run.
  const tokenCache = new Map<string, string | null>()

  async function tokenForUser(userId: string): Promise<string | null> {
    if (tokenCache.has(userId)) return tokenCache.get(userId)!
    const token = await resolveToken(supabase, userId, clientId!, clientSecret!)
    tokenCache.set(userId, token)
    return token
  }

  const results: Array<{ mappingId: string; familyId: string; synced: number; deleted: number; errors: string[] }> = []

  for (const mapping of mappings) {
    const errors: string[] = []
    let synced = 0
    let deleted = 0

    // Pick the user whose token we'll use: the mapping's owner if set,
    // otherwise any parent in the family with a valid token.
    const candidates = mapping.created_by_user_id
      ? [mapping.created_by_user_id, ...(familyParents.get(mapping.family_id) ?? []).filter((id) => id !== mapping.created_by_user_id)]
      : (familyParents.get(mapping.family_id) ?? [])

    let accessToken: string | null = null
    for (const userId of candidates) {
      accessToken = await tokenForUser(userId)
      if (accessToken) break
    }

    if (!accessToken) {
      results.push({ mappingId: mapping.id, familyId: mapping.family_id, synced: 0, deleted: 0, errors: ['No valid Google token'] })
      continue
    }

    try {
      const tasks = await fetchAllTasks(mapping.google_tasklist_id, accessToken)
      const defaultReward = Number(mapping.default_reward)

      for (const task of tasks) {
        if (!task.id) continue

        if (task.deleted) {
          // Delete chores that haven't been paid out yet; keep historical ones.
          const { error: delErr, count } = await supabase
            .from('chores')
            .delete({ count: 'exact' })
            .eq('google_task_id', task.id)
            .eq('family_id', mapping.family_id)
            .in('status', ['assigned', 'done'])
          if (delErr) errors.push(`delete "${task.title ?? task.id}": ${delErr.message}`)
          else if (count) deleted += count
          continue
        }

        if (!task.title?.trim()) continue

        const { data: existing } = await supabase
          .from('chores')
          .select('id, status')
          .eq('google_task_id', task.id)
          .eq('family_id', mapping.family_id)
          .maybeSingle()

        if (existing) {
          if (task.status === 'completed' && existing.status === 'assigned') {
            await supabase.from('chores').update({ status: 'done' }).eq('id', existing.id)
            synced++
          } else if (task.status === 'needsAction' && existing.status === 'done') {
            await supabase.from('chores').update({ status: 'assigned' }).eq('id', existing.id)
            synced++
          }
          continue
        }

        let reward = defaultReward
        if (task.notes) {
          const match = task.notes.match(/\$(\d+(?:\.\d{1,2})?)/)
          if (match?.[1]) {
            const parsed = parseFloat(match[1])
            if (!isNaN(parsed)) reward = parsed
          }
        }

        const { error: insertErr } = await supabase.from('chores').insert({
          family_id: mapping.family_id,
          assigned_to_child_id: mapping.child_id,
          title: task.title,
          value: reward,
          status: task.status === 'completed' ? 'done' : 'assigned',
          due_date: task.due ? task.due.split('T')[0] : null,
          source: 'google_tasks',
          google_task_id: task.id,
          is_recurring: false,
        })

        if (insertErr) errors.push(`insert "${task.title}": ${insertErr.message}`)
        else synced++
      }

      await supabase
        .from('google_task_mappings')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', mapping.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`"${mapping.google_tasklist_title}": ${msg}`)
    }

    results.push({ mappingId: mapping.id, familyId: mapping.family_id, synced, deleted, errors })
  }

  console.log('Nightly sync complete:', JSON.stringify(results))
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

async function resolveToken(
  supabase: SupabaseClient,
  userId: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('google_tokens')
    .select('id, user_id, access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle<TokenRow>()

  if (!data) return null

  const expiresAt = new Date(data.expires_at).getTime()
  if (expiresAt - Date.now() >= 5 * 60 * 1000) return data.access_token

  if (!data.refresh_token) {
    await supabase.from('google_tokens').delete().eq('id', data.id)
    return null
  }

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    if (body.error === 'invalid_grant') {
      await supabase.from('google_tokens').delete().eq('id', data.id)
    } else {
      console.warn(`Token refresh failed for user ${userId}: ${resp.status}`, body)
    }
    return null
  }

  const refreshed = await resp.json()
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await supabase
    .from('google_tokens')
    .update({ access_token: refreshed.access_token, expires_at: newExpiry })
    .eq('id', data.id)

  return refreshed.access_token as string
}

async function fetchAllTasks(tasklistId: string, accessToken: string): Promise<GoogleTask[]> {
  const tasks: GoogleTask[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${GOOGLE_TASKS_API}/lists/${encodeURIComponent(tasklistId)}/tasks`)
    url.searchParams.set('maxResults', '100')
    url.searchParams.set('showCompleted', 'true')
    url.searchParams.set('showHidden', 'true')
    url.searchParams.set('showDeleted', 'true')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`Tasks API ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`)
    }

    const data = await resp.json()
    if (Array.isArray(data.items)) tasks.push(...(data.items as GoogleTask[]))
    pageToken = data.nextPageToken
  } while (pageToken)

  return tasks
}
