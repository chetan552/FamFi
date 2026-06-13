"use client";

import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/dashboard");
  }

  async function handleGoogle() {
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (googleError) setError(googleError.message);
  }

  return (
    <main className="center-screen auth-page">
      <form className="auth-card form-grid" onSubmit={handleSubmit}>
        <Link href="/welcome" className="brand" style={{ marginBottom: 0 }}>
          <span className="brand-mark">💰</span>
          <span>FamFi Piggy Bank</span>
        </Link>
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Login</h1>
          <p className="muted" style={{ margin: 0 }}>Manage chores, savings, and payday from the browser.</p>
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <button className="ghost-button" type="button" onClick={handleGoogle}>
          Continue with Google
        </button>
        <div className="auth-link-row">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/signup">Create account</Link>
          <Link href="/child-login">Kid login</Link>
        </div>
      </form>
    </main>
  );
}
