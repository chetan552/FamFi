"use client";

import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError("Enter your email address.");

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setNotice("If an account exists, a reset link has been sent.");
  }

  return (
    <main className="center-screen auth-page">
      <form className="auth-card form-grid" onSubmit={handleSubmit}>
        <Link href="/welcome" className="brand auth-brand">
          <span className="brand-mark">💰</span>
          <span>FamFi Piggy Bank</span>
        </Link>
        <div>
          <h1>Reset Password</h1>
          <p className="muted">Enter your email to receive a reset link.</p>
        </div>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="success-text">{notice}</p> : null}
        <button className="button" type="submit" disabled={loading}>{loading ? "Sending..." : "Send Reset Link"}</button>
        <Link href="/login" className="ghost-button auth-link-button">Back to Sign In</Link>
      </form>
    </main>
  );
}
