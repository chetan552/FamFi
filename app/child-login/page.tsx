"use client";

import { supabase } from "@/lib/supabase-browser";
import type { User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ChildLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState("");
  const [children, setChildren] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function findFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!inviteCode.trim()) return setError("Enter your family link code.");

    setLoading(true);
    const { data, error: lookupError } = await supabase.rpc("get_children_by_invite", {
      p_invite_code: inviteCode.trim().toUpperCase(),
    });
    setLoading(false);

    if (lookupError) {
      setError(lookupError.message);
      return;
    }

    const nextChildren = (data as User[] | null) ?? [];
    if (nextChildren.length === 0) {
      setError("No kids found for this family link code.");
      return;
    }

    setChildren(nextChildren);
    setStep(2);
  }

  async function selectChild(childId: string) {
    setError(null);
    setLoading(true);

    await supabase.auth.signOut();

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      setLoading(false);
      setError(authError?.message ?? "Failed to authenticate.");
      return;
    }

    const { error: linkError } = await supabase.rpc("link_child_account", {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_child_id: childId,
    });

    if (linkError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(linkError.message);
      return;
    }

    setLoading(false);
    router.replace(`/child-dashboard/${childId}`);
  }

  return (
    <main className="center-screen auth-page">
      <div className="auth-card form-grid">
        <Link href="/welcome" className="brand auth-brand">
          <span className="brand-mark">💰</span>
          <span>FamFi Piggy Bank</span>
        </Link>
        <div>
          <h1>Kid Login</h1>
          <p className="muted">{step === 1 ? "Enter your family link code." : "Who is using the piggy bank?"}</p>
        </div>

        {step === 1 ? (
          <form className="form-grid" onSubmit={findFamily}>
            <div className="form-field">
              <label htmlFor="invite-code">Family Link Code</label>
              <input
                id="invite-code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                maxLength={6}
                autoComplete="off"
                required
              />
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="button" type="submit" disabled={loading}>{loading ? "Finding..." : "Find My Family"}</button>
            <Link href="/login" className="ghost-button auth-link-button">Parent Login</Link>
          </form>
        ) : (
          <div className="form-grid">
            {error ? <p className="error-text">{error}</p> : null}
            <div className="kid-login-grid">
              {children.map((child) => (
                <button className="kid-choice-card" type="button" key={child.id} onClick={() => selectChild(child.id)} disabled={loading}>
                  <span>{child.avatar_emoji}</span>
                  <strong>{child.name}</strong>
                </button>
              ))}
            </div>
            <button className="ghost-button" type="button" onClick={() => setStep(1)} disabled={loading}>Back</button>
          </div>
        )}
      </div>
    </main>
  );
}
