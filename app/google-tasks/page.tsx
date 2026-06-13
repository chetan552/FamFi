"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { GoogleTaskMapping, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type GoogleTasksData = {
  profile: User;
  children: User[];
  connected: boolean;
  mappings: GoogleTaskMapping[];
};

type GoogleTaskList = {
  id: string;
  title: string;
};

async function loadGoogleTasksData(): Promise<GoogleTasksData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [childrenResult, tokenResult, mappingsResult] = await Promise.all([
    supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child").order("created_at", { ascending: true }),
    supabase.from("google_tokens").select("id").eq("user_id", profile.id).maybeSingle(),
    supabase.from("google_task_mappings").select("*").eq("family_id", profile.family_id).order("created_at", { ascending: true }),
  ]);

  return {
    profile: profile as User,
    children: (childrenResult.data as User[] | null) ?? [],
    connected: !!tokenResult.data,
    mappings: (mappingsResult.data as GoogleTaskMapping[] | null) ?? [],
  };
}

export default function GoogleTasksPage() {
  const router = useRouter();
  const [data, setData] = useState<GoogleTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskListId, setTaskListId] = useState("");
  const [taskListTitle, setTaskListTitle] = useState("");
  const [childId, setChildId] = useState("");
  const [defaultReward, setDefaultReward] = useState("1.00");
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadGoogleTasksData();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    setChildId((current) => current || nextData.children[0]?.id || "");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadTaskLists = useCallback(async (accessToken: string) => {
    setLoadingLists(true);
    setError(null);
    const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setLoadingLists(false);
    if (!response.ok) {
      setError("Connected, but task lists could not be loaded. Reconnect Google Tasks if this continues.");
      return;
    }
    const payload = await response.json();
    setTaskLists((payload.items ?? []) as GoogleTaskList[]);
  }, []);

  const exchangeGoogleCode = useCallback(async (code: string, codeVerifier: string, userId: string) => {
    setSaving(true);
    setError(null);
    setNotice(null);

    const redirectUri = `${window.location.origin}/google-tasks`;
    const response = await fetch("/api/google-tasks/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier, redirectUri }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Google token exchange failed.");

    const expiresAt = new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString();
    const tokenPayload: Record<string, string> = {
      user_id: userId,
      access_token: payload.access_token,
      expires_at: expiresAt,
    };
    if (payload.refresh_token) {
      tokenPayload.refresh_token = payload.refresh_token;
    } else {
      const { data: existingToken } = await supabase.from("google_tokens").select("id").eq("user_id", userId).maybeSingle();
      if (!existingToken) {
        throw new Error("Google did not return a refresh token. Try connecting again.");
      }
    }

    const { error: saveError } = await supabase
      .from("google_tokens")
      .upsert(tokenPayload, { onConflict: "user_id" });

    if (saveError) throw saveError;

    setSaving(false);
    setNotice("Google Tasks connected.");
    await loadTaskLists(payload.access_token);
    await refresh();
  }, [loadTaskLists, refresh]);

  useEffect(() => {
    if (!data) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const storedState = sessionStorage.getItem("famfi-google-oauth-state");
    const codeVerifier = sessionStorage.getItem("famfi-google-code-verifier");

    if (!code && !params.get("error")) return;

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, "", cleanUrl);

    if (params.get("error")) {
      setError("Google connection was cancelled or failed.");
      return;
    }

    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
      setError("Google connection state could not be verified. Try connecting again.");
      return;
    }

    sessionStorage.removeItem("famfi-google-oauth-state");
    sessionStorage.removeItem("famfi-google-code-verifier");

    exchangeGoogleCode(code, codeVerifier, data.profile.id)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Google connection failed.");
      })
      .finally(() => setSaving(false));
  }, [data, exchangeGoogleCode]);

  async function connectGoogle() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const codeVerifier = randomString(64);
      const codeChallenge = await sha256Base64Url(codeVerifier);
      const state = randomString(32);
      const redirectUri = `${window.location.origin}/google-tasks`;
      sessionStorage.setItem("famfi-google-code-verifier", codeVerifier);
      sessionStorage.setItem("famfi-google-oauth-state", state);

      const response = await fetch("/api/google-tasks/auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeChallenge, redirectUri, state }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not start Google OAuth.");

      window.location.href = payload.url;
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "Could not start Google OAuth.");
    }
  }

  async function disconnectGoogle() {
    if (!data) return;
    const confirmed = window.confirm("Disconnect Google Tasks? Existing chores from Google Tasks will remain.");
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: tokenError } = await supabase.from("google_tokens").delete().eq("user_id", data.profile.id);
    setSaving(false);

    if (tokenError) {
      setError(tokenError.message);
      return;
    }

    setNotice("Google Tasks disconnected.");
    await refresh();
  }

  async function removeMapping(mapping: GoogleTaskMapping) {
    const confirmed = window.confirm(`Stop syncing "${mapping.google_tasklist_title}"?`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase.from("google_task_mappings").delete().eq("id", mapping.id);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setNotice("Mapping removed.");
    await refresh();
  }

  async function saveManualMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const reward = Number(defaultReward);
    if (!taskListId.trim()) return setError("Enter a Google task list ID.");
    if (!taskListTitle.trim()) return setError("Enter a task list title.");
    if (!childId) return setError("Select a child.");
    if (!Number.isFinite(reward) || reward <= 0) return setError("Enter a reward greater than $0.");

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: saveError } = await supabase
      .from("google_task_mappings")
      .upsert(
        {
          family_id: data.profile.family_id,
          google_tasklist_id: taskListId.trim(),
          google_tasklist_title: taskListTitle.trim(),
          child_id: childId,
          default_reward: Number(reward.toFixed(2)),
          created_by_user_id: data.profile.id,
        },
        { onConflict: "family_id,google_tasklist_id" },
      );

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setTaskListId("");
    setTaskListTitle("");
    setDefaultReward("1.00");
    setNotice("Mapping saved.");
    await refresh();
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Integrations"
        title="Google Tasks"
        description="Sync Google task lists into FamFi chores."
        action={<Link href="/settings" className="button ghost-button">Settings</Link>}
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <section className="card integration-status-card">
        <div className="avatar">G</div>
        <div>
          <h2>{data.connected ? "Connected" : "Not Connected"}</h2>
          <p className="muted">
            {data.connected
              ? "Your Google account is linked. Map task lists to children so they sync as chores."
              : "Connect your Google account to map task lists to children."}
          </p>
        </div>
        {data.connected ? (
          <button className="button danger-button" onClick={disconnectGoogle} disabled={saving}>Disconnect</button>
        ) : (
          <button className="button" type="button" onClick={connectGoogle} disabled={saving}>{saving ? "Connecting..." : "Connect"}</button>
        )}
      </section>

      {data.connected ? (
        <section className="settings-grid google-tasks-grid">
          <article className="card settings-card">
            <h2>Active Mappings</h2>
            <div className="settings-list">
              {data.mappings.length === 0 ? (
                <p className="muted">No task lists mapped yet.</p>
              ) : data.mappings.map((mapping) => {
                const child = data.children.find((item) => item.id === mapping.child_id);
                return (
                  <div className="settings-row" key={mapping.id}>
                    <span className="avatar small">G</span>
                    <div>
                      <strong>{mapping.google_tasklist_title}</strong>
                      <p className="muted">
                        {child ? `${child.avatar_emoji} ${child.name}` : "Unknown child"} · ${Number(mapping.default_reward).toFixed(2)} each
                      </p>
                      {mapping.last_synced_at ? <p className="muted">Last synced {new Date(mapping.last_synced_at).toLocaleString()}</p> : null}
                    </div>
                    <button className="button danger-button" onClick={() => removeMapping(mapping)} disabled={saving}>Remove</button>
                  </div>
                );
              })}
            </div>
          </article>

          {taskLists.length > 0 ? (
            <article className="card settings-card wide">
              <h2>Available Task Lists</h2>
              <div className="settings-list">
                {taskLists.map((list) => {
                  const mapped = data.mappings.some((mapping) => mapping.google_tasklist_id === list.id);
                  return (
                    <div className="settings-row" key={list.id}>
                      <span className="avatar small">G</span>
                      <div>
                        <strong>{list.title}</strong>
                        <p className="muted">{mapped ? "Already mapped" : "Ready to map"}</p>
                      </div>
                      <button
                        className="button ghost-button"
                        type="button"
                        disabled={mapped}
                        onClick={() => {
                          setTaskListId(list.id);
                          setTaskListTitle(list.title);
                        }}
                      >
                        Use
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : data.connected ? (
            <article className="card settings-card wide">
              <h2>Available Task Lists</h2>
              <p className="muted">
                {loadingLists ? "Loading task lists..." : "Task lists load after connecting. Reconnect if you need to choose another list."}
              </p>
            </article>
          ) : null}

          <article className="card settings-card">
            <h2>Manual Mapping</h2>
            <p className="muted">Choose a loaded task list or add a known task list ID manually.</p>
            <form className="form-grid" onSubmit={saveManualMapping}>
              <div className="form-field">
                <label htmlFor="task-list-id">Google Task List ID</label>
                <input id="task-list-id" value={taskListId} onChange={(event) => setTaskListId(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="task-list-title">Display Title</label>
                <input id="task-list-title" value={taskListTitle} onChange={(event) => setTaskListTitle(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="mapped-child">Child</label>
                <select id="mapped-child" value={childId} onChange={(event) => setChildId(event.target.value)}>
                  {data.children.map((child) => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="default-reward">Default Reward</label>
                <input id="default-reward" inputMode="decimal" value={defaultReward} onChange={(event) => setDefaultReward(event.target.value)} />
              </div>
              <button className="button" type="submit" disabled={saving || data.children.length === 0}>Save Mapping</button>
            </form>
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}

function randomString(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256Base64Url(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
