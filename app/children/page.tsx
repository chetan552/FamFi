"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { User } from "@/types/database";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CHILD_EMOJIS = ["😊", "😎", "🤩", "🦄", "🐼", "🦊", "🐯", "🧒", "👧", "👦", "🌟", "🚀"];

type ChildrenData = {
  profile: User;
  children: User[];
};

type ChildFormState = {
  id?: string;
  name: string;
  avatarEmoji: string;
};

async function loadChildren(): Promise<ChildrenData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!profile?.family_id) return null;

  const { data: children } = await supabase
    .from("users")
    .select("*")
    .eq("family_id", profile.family_id)
    .eq("role", "child")
    .order("created_at", { ascending: true });

  return {
    profile: profile as User,
    children: (children as User[] | null) ?? [],
  };
}

export default function ChildrenPage() {
  const router = useRouter();
  const [data, setData] = useState<ChildrenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ChildFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadChildren();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openAddForm() {
    setError(null);
    setNotice(null);
    setForm({ name: "", avatarEmoji: "😊" });
  }

  function openEditForm(child: User) {
    setError(null);
    setNotice(null);
    setForm({ id: child.id, name: child.name, avatarEmoji: child.avatar_emoji });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !form) return;

    const name = form.name.trim();
    if (!name) {
      setError("Enter a child name.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const result = form.id
      ? await supabase
          .from("users")
          .update({ name, avatar_emoji: form.avatarEmoji })
          .eq("id", form.id)
          .eq("family_id", data.profile.family_id)
          .eq("role", "child")
      : await supabase
          .from("users")
          .insert({
            family_id: data.profile.family_id,
            role: "child",
            name,
            avatar_emoji: form.avatarEmoji,
            auth_id: null,
          });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setForm(null);
    setNotice(form.id ? `${name} updated.` : `${name} added.`);
    await refresh();
  }

  async function removeChild(child: User) {
    if (!data) return;
    const confirmed = window.confirm(`Remove ${child.name}? This can fail if the child already has chores, buckets, or transactions.`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", child.id)
      .eq("family_id", data.profile.family_id)
      .eq("role", "child");

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setNotice(`${child.name} removed.`);
    await refresh();
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Family Setup"
        title="Children"
        description="Add each child who will earn chore rewards and save in family buckets."
        action={
          <div className="inline-actions">
            <Link href="/dashboard" className="button ghost-button">Dashboard</Link>
            <button className="button" onClick={openAddForm}>Add Child</button>
          </div>
        }
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      {data.children.length === 0 ? (
        <section className="card empty-card page-empty">
          <div className="empty-icon">🧒</div>
          <h2>No children added yet</h2>
          <p className="muted">Start with one child profile. You can add more any time.</p>
          <button className="button" onClick={openAddForm}>Add First Child</button>
        </section>
      ) : (
        <section className="children-grid">
          {data.children.map((child) => (
            <article className="card child-profile-card" key={child.id}>
              <div className="avatar large">{child.avatar_emoji}</div>
              <div>
                <h2><Link href={`/children/${child.id}`}>{child.name}</Link></h2>
                <p className="muted">Child profile</p>
              </div>
              <div className="inline-actions">
                <button className="button ghost-button" onClick={() => openEditForm(child)}>Edit</button>
                <button className="button danger-button" onClick={() => removeChild(child)} disabled={saving}>Remove</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="page-footer-actions">
        <Link href="/bucket-templates" className="button">Set Up Buckets</Link>
        <Link href="/chores/new" className="button ghost-button">Create Chore</Link>
      </div>

      {form ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel form-grid" onSubmit={handleSubmit}>
            <div className="modal-title-row">
              <h2>{form.id ? "Edit Child" : "Add a Child"}</h2>
              <button className="icon-button" type="button" onClick={() => setForm(null)} aria-label="Close child form">
                ×
              </button>
            </div>
            <div className="form-field">
              <label htmlFor="child-name">Child Name</label>
              <input
                id="child-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="field-label">Pick an Avatar</label>
              <div className="emoji-grid">
                {CHILD_EMOJIS.map((emoji) => (
                  <button
                    className={form.avatarEmoji === emoji ? "emoji-choice active" : "emoji-choice"}
                    type="button"
                    key={emoji}
                    onClick={() => setForm({ ...form, avatarEmoji: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="modal-actions">
              <button className="button ghost-button" type="button" onClick={() => setForm(null)}>Cancel</button>
              <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
