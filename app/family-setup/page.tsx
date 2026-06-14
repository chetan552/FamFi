"use client";

import { supabase } from "@/lib/supabase-browser";
import { generateInviteCode } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SetupMode = "create" | "join";
type LoadedProfile =
  | { authUser: { id: string }; profile: { id: string } }
  | { error: string };

export default function FamilySetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SetupMode>("create");
  const [familyName, setFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProfile(): Promise<LoadedProfile> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return { error: "Sign in again." };

    const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
    if (!profile) return { error: "Complete your profile first." };

    return { authUser, profile };
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const loaded = await loadProfile();
    if ("error" in loaded) {
      setSaving(false);
      return setError(loaded.error);
    }

    const { data: family, error: createError } = await supabase
      .from("families")
      .insert({ name: familyName.trim(), invite_code: generateInviteCode(), created_by: loaded.authUser.id })
      .select("*")
      .single();
    if (createError) {
      setSaving(false);
      return setError(createError.message);
    }

    const { error: updateError } = await supabase.rpc("attach_created_family", {
      p_family_id: family.id,
    });
    setSaving(false);

    if (updateError) return setError(updateError.message);
    router.replace("/children");
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const normalizedCode = joinCode.trim().toUpperCase();
    if (normalizedCode.length < 6) {
      setSaving(false);
      return setError("Enter the 6-character invite code.");
    }

    const loaded = await loadProfile();
    if ("error" in loaded) {
      setSaving(false);
      return setError(loaded.error);
    }

    const { error: updateError } = await supabase.rpc("join_family_by_invite", {
      p_invite_code: normalizedCode,
    });
    setSaving(false);

    if (updateError) return setError(updateError.message);
    router.replace("/dashboard");
  }

  return (
    <main className="center-screen family-setup-page">
      <div className="auth-card setup-card family-setup-card">
        <div className="family-setup-header">
          <p className="eyebrow">Family Setup</p>
          <h1>Set Up Your Family</h1>
          <p className="muted">Create a family bank or join an existing one with an invite code.</p>
        </div>

        <div className="family-setup-tabs" aria-label="Family setup option" role="tablist">
          <button className={mode === "create" ? "active" : ""} type="button" onClick={() => { setMode("create"); setError(null); }}>
            Create New
          </button>
          <button className={mode === "join" ? "active" : ""} type="button" onClick={() => { setMode("join"); setError(null); }}>
            Join Existing
          </button>
        </div>

        {mode === "create" ? (
          <form className="form-grid" onSubmit={handleCreate}>
            <div className="form-field">
              <label htmlFor="family-name">Family Name</label>
              <input id="family-name" value={familyName} onChange={(event) => setFamilyName(event.target.value)} required />
            </div>
            <button className="button" type="submit" disabled={saving}>{saving ? "Creating..." : "Create Family"}</button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={handleJoin}>
            <div className="form-field">
              <label htmlFor="join-code">Invite Code</label>
              <input
                autoCapitalize="characters"
                id="join-code"
                maxLength={6}
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                required
              />
            </div>
            <button className="button" type="submit" disabled={saving}>{saving ? "Joining..." : "Join Family"}</button>
          </form>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </main>
  );
}
