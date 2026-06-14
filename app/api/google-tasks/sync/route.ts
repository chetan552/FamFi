import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TASKS_API = "https://tasks.googleapis.com/tasks/v1";

type GoogleTask = {
  id: string;
  title?: string;
  status?: "needsAction" | "completed";
  notes?: string;
  due?: string;
  deleted?: boolean;
};

type GoogleToken = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
};

type GoogleTaskMapping = {
  id: string;
  family_id: string;
  child_id: string;
  google_tasklist_id: string;
  google_tasklist_title: string;
  default_reward: number | string;
  created_by_user_id: string | null;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const accessJwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!accessJwt) {
    return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseAnonKey || !googleClientId || !googleClientSecret) {
    return NextResponse.json({ error: "Server is missing Google Tasks sync configuration." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessJwt}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(accessJwt);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Invalid authorization token." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, family_id")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile?.family_id) {
    return NextResponse.json({ error: "No family found for this user." }, { status: 400 });
  }

  const { data: tokenData, error: tokenError } = await supabase
    .from("google_tokens")
    .select("id, access_token, refresh_token, expires_at")
    .eq("user_id", profile.id)
    .maybeSingle<GoogleToken>();

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }
  if (!tokenData) {
    return NextResponse.json({ error: "Google account not connected." }, { status: 400 });
  }

  const tokenResult = await resolveAccessToken(supabase, tokenData, googleClientId, googleClientSecret);
  if (!tokenResult.accessToken) {
    return NextResponse.json({ error: tokenResult.error ?? "Google token is no longer valid. Reconnect Google Tasks." }, { status: 400 });
  }

  const { data: mappingsData, error: mappingError } = await supabase
    .from("google_task_mappings")
    .select("id, family_id, child_id, google_tasklist_id, google_tasklist_title, default_reward, created_by_user_id")
    .eq("family_id", profile.family_id);

  if (mappingError) {
    return NextResponse.json({ error: mappingError.message }, { status: 500 });
  }

  const mappings = ((mappingsData ?? []) as GoogleTaskMapping[]).filter(
    (mapping) => !mapping.created_by_user_id || mapping.created_by_user_id === profile.id,
  );

  if (mappings.length === 0) {
    return NextResponse.json({ synced: 0, deleted: 0, errors: ["No task lists mapped for your Google account."] });
  }

  let synced = 0;
  let deleted = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    try {
      const tasks = await fetchAllTasks(mapping.google_tasklist_id, tokenResult.accessToken);

      for (const task of tasks) {
        if (!task.id) continue;

        if (task.deleted) {
          const { error: deleteError, count } = await supabase
            .from("chores")
            .delete({ count: "exact" })
            .eq("google_task_id", task.id)
            .eq("family_id", mapping.family_id)
            .in("status", ["assigned", "done"]);

          if (deleteError) errors.push(`Delete ${task.title ?? task.id}: ${deleteError.message}`);
          else if (count) deleted += count;
          continue;
        }

        if (!task.title?.trim()) continue;

        const { data: existing, error: existingError } = await supabase
          .from("chores")
          .select("id, status")
          .eq("google_task_id", task.id)
          .eq("family_id", mapping.family_id)
          .maybeSingle();

        if (existingError) {
          errors.push(`Read ${task.title}: ${existingError.message}`);
          continue;
        }

        if (existing) {
          if (task.status === "completed" && existing.status === "assigned") {
            const { error: updateError } = await supabase.from("chores").update({ status: "done" }).eq("id", existing.id);
            if (updateError) errors.push(`Update ${task.title}: ${updateError.message}`);
            else synced++;
          } else if (task.status === "needsAction" && existing.status === "done") {
            const { error: updateError } = await supabase.from("chores").update({ status: "assigned" }).eq("id", existing.id);
            if (updateError) errors.push(`Update ${task.title}: ${updateError.message}`);
            else synced++;
          }
          continue;
        }

        const { error: insertError } = await supabase.from("chores").insert({
          family_id: mapping.family_id,
          assigned_to_child_id: mapping.child_id,
          title: task.title.trim(),
          value: parseReward(task.notes, mapping.default_reward),
          status: task.status === "completed" ? "done" : "assigned",
          due_date: task.due ? task.due.split("T")[0] : null,
          source: "google_tasks",
          google_task_id: task.id,
          is_recurring: false,
          recurrence_period: null,
        });

        if (insertError) errors.push(`Insert ${task.title}: ${insertError.message}`);
        else synced++;
      }

      const { error: syncError } = await supabase
        .from("google_task_mappings")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", mapping.id);

      if (syncError) errors.push(`Update sync time for ${mapping.google_tasklist_title}: ${syncError.message}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      errors.push(`${mapping.google_tasklist_title}: ${message}`);
    }
  }

  return NextResponse.json({ synced, deleted, errors });
}

function parseReward(notes: string | undefined, defaultReward: number | string) {
  const fallback = Number(defaultReward);
  if (!notes) return fallback;
  const match = notes.match(/\$(\d+(?:\.\d{1,2})?)/);
  if (!match?.[1]) return fallback;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function resolveAccessToken(
  supabase: SupabaseClient,
  token: GoogleToken,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string | null; error?: string }> {
  const expiresAt = new Date(token.expires_at).getTime();
  if (expiresAt - Date.now() >= 5 * 60 * 1000) {
    return { accessToken: token.access_token };
  }

  if (!token.refresh_token) {
    await supabase.from("google_tokens").delete().eq("id", token.id);
    return { accessToken: null, error: "Google token expired. Reconnect Google Tasks." };
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (payload?.error === "invalid_grant") {
      await supabase.from("google_tokens").delete().eq("id", token.id);
    }
    return { accessToken: null, error: "Google token refresh failed. Reconnect Google Tasks." };
  }

  const refreshed = await response.json();
  const expiresAtIso = new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString();
  const { error } = await supabase
    .from("google_tokens")
    .update({ access_token: refreshed.access_token, expires_at: expiresAtIso })
    .eq("id", token.id);

  if (error) return { accessToken: null, error: error.message };
  return { accessToken: refreshed.access_token };
}

async function fetchAllTasks(taskListId: string, accessToken: string): Promise<GoogleTask[]> {
  const tasks: GoogleTask[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GOOGLE_TASKS_API}/lists/${encodeURIComponent(taskListId)}/tasks`);
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("showCompleted", "true");
    url.searchParams.set("showHidden", "true");
    url.searchParams.set("showDeleted", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google Tasks API ${response.status}: ${body.slice(0, 180)}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload.items)) tasks.push(...(payload.items as GoogleTask[]));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return tasks;
}
