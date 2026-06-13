"use client";

import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return setError("Sign in again.");

    const { error: insertError } = await supabase.from("users").insert({
      auth_id: authUser.id,
      role: "parent",
      name: name.trim(),
      avatar_emoji: "😊",
    });

    if (insertError) return setError(insertError.message);
    router.replace("/family-setup");
  }

  return (
    <main className="center-screen">
      <form className="auth-card form-grid" onSubmit={handleSubmit}>
        <h1 style={{ margin: 0 }}>Almost There</h1>
        <p className="muted">What should we call you?</p>
        <div className="form-field">
          <label htmlFor="name">Your Name</label>
          <input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" type="submit">Continue</button>
      </form>
    </main>
  );
}
