"use client";

import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter your name.");
    if (!email.trim() || !email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert({
        auth_id: data.user.id,
        role: "parent",
        name: name.trim(),
        avatar_emoji: "😊",
      });

      if (profileError) {
        setLoading(false);
        setError("Account created, but profile setup failed. Try logging in.");
        return;
      }
    }

    setLoading(false);
    router.replace("/family-setup");
  }

  async function handleGoogle() {
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/complete-profile` },
    });
    if (googleError) setError(googleError.message);
  }

  return (
    <main className="center-screen auth-page">
      <form className="auth-card form-grid" onSubmit={handleSubmit}>
        <Link href="/welcome" className="brand auth-brand">
          <span className="brand-mark">💰</span>
          <span>FamFi Piggy Bank</span>
        </Link>
        <div>
          <h1>Create Account</h1>
          <p className="muted">Start your family piggy bank from the browser.</p>
        </div>
        <div className="form-field">
          <label htmlFor="name">Your Name</label>
          <input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="confirm-password">Confirm Password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" type="submit" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
        <button className="ghost-button" type="button" onClick={handleGoogle}>Continue with Google</button>
        <p className="auth-footer muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
