"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { BucketTemplate, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const BUCKET_COLORS = ["#2B9EB3", "#4CAF50", "#F5A623", "#E85D75", "#7C4DFF", "#FF7043", "#26A69A", "#5C6BC0", "#EC407A", "#42A5F5"];
const BUCKET_EMOJIS = ["💰", "🎮", "🎁", "📚", "🎨", "⚽", "🎵", "🍕", "🐾", "✈️", "🏠", "💝"];
const DEFAULT_BUCKETS = [
  { name: "Savings", emoji: "💰", color: "#4CAF50" },
  { name: "Fun Money", emoji: "🎮", color: "#7C4DFF" },
  { name: "Giving", emoji: "🎁", color: "#E85D75" },
];

type BucketPageData = {
  profile: User;
  templates: BucketTemplate[];
};

type BucketFormState = {
  id?: string;
  name: string;
  emoji: string;
  color: string;
};

async function loadBucketTemplates(): Promise<BucketPageData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!profile?.family_id) return null;

  const { data: templates } = await supabase
    .from("bucket_templates")
    .select("*")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    profile: profile as User,
    templates: (templates as BucketTemplate[] | null) ?? [],
  };
}

export default function BucketTemplatesPage() {
  const router = useRouter();
  const [data, setData] = useState<BucketPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BucketFormState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadBucketTemplates();
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

  const unusedSuggestions = useMemo(() => {
    const existing = new Set((data?.templates ?? []).map((template) => template.name.toLowerCase()));
    return DEFAULT_BUCKETS.filter((bucket) => !existing.has(bucket.name.toLowerCase()));
  }, [data?.templates]);

  function openAddForm(template?: { name: string; emoji: string; color: string }) {
    setError(null);
    setNotice(null);
    setForm({
      name: template?.name ?? "",
      emoji: template?.emoji ?? "💰",
      color: template?.color ?? BUCKET_COLORS[0],
    });
  }

  function openEditForm(template: BucketTemplate) {
    setError(null);
    setNotice(null);
    setForm({
      id: template.id,
      name: template.name,
      emoji: template.emoji,
      color: template.color,
    });
  }

  async function saveBucket(bucket: BucketFormState) {
    if (!data) return;
    const name = bucket.name.trim();
    if (!name) {
      setError("Enter a bucket name.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const result = bucket.id
      ? await supabase
          .from("bucket_templates")
          .update({ name, emoji: bucket.emoji, color: bucket.color })
          .eq("id", bucket.id)
          .eq("family_id", data.profile.family_id)
      : await supabase
          .from("bucket_templates")
          .insert({
            family_id: data.profile.family_id,
            name,
            emoji: bucket.emoji,
            color: bucket.color,
            sort_order: data.templates.length,
            is_active: true,
          });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setForm(null);
    setNotice(bucket.id ? `${name} updated.` : `${name} added.`);
    await refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form) await saveBucket(form);
  }

  async function addSuggestion(template: { name: string; emoji: string; color: string }) {
    await saveBucket({ name: template.name, emoji: template.emoji, color: template.color });
  }

  async function removeTemplate(template: BucketTemplate) {
    if (!data) return;
    const confirmed = window.confirm(`Remove "${template.name}"? Existing bucket history stays in place, but the template will no longer be used.`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("bucket_templates")
      .update({ is_active: false })
      .eq("id", template.id)
      .eq("family_id", data.profile.family_id);

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setNotice(`${template.name} removed.`);
    await refresh();
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Family Setup"
        title="Savings Buckets"
        description="Create the categories children use when payday money is split."
        action={
          <div className="inline-actions">
            <Link href="/children" className="button ghost-button">Children</Link>
            <button className="button" onClick={() => openAddForm()}>Add Bucket</button>
          </div>
        }
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      {unusedSuggestions.length > 0 ? (
        <section className="card quick-add-card">
          <div>
            <h2>Quick Add</h2>
            <p className="muted">Start with the same default buckets from the Flutter app.</p>
          </div>
          <div className="bucket-suggestion-row">
            {unusedSuggestions.map((bucket) => (
              <button className="bucket-suggestion" key={bucket.name} onClick={() => addSuggestion(bucket)} disabled={saving}>
                <span>{bucket.emoji}</span>
                <strong>{bucket.name}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {data.templates.length === 0 ? (
        <section className="card empty-card page-empty">
          <div className="empty-icon">🪣</div>
          <h2>No buckets yet</h2>
          <p className="muted">Use quick-adds or create a custom bucket before running payday.</p>
          <button className="button" onClick={() => openAddForm()}>Create Bucket</button>
        </section>
      ) : (
        <section className="bucket-template-grid">
          {data.templates.map((template) => (
            <article className="card bucket-template-card" style={{ borderLeftColor: template.color }} key={template.id}>
              <div className="bucket-template-icon" style={{ backgroundColor: `${template.color}22`, color: template.color }}>
                {template.emoji}
              </div>
              <div>
                <h2>{template.name}</h2>
                <p className="muted">Active bucket template</p>
              </div>
              <div className="inline-actions">
                <button className="button ghost-button" onClick={() => openEditForm(template)}>Edit</button>
                <button className="button danger-button" onClick={() => removeTemplate(template)} disabled={saving}>Remove</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="page-footer-actions">
        <Link href="/dashboard" className="button">Finish Setup</Link>
        <Link href="/chores/new" className="button ghost-button">Create Chore</Link>
      </div>

      {form ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel form-grid" onSubmit={handleSubmit}>
            <div className="modal-title-row">
              <h2>{form.id ? "Edit Bucket" : "Create a Bucket"}</h2>
              <button className="icon-button" type="button" onClick={() => setForm(null)} aria-label="Close bucket form">
                ×
              </button>
            </div>
            <div className="form-field">
              <label htmlFor="bucket-name">Bucket Name</label>
              <input
                id="bucket-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="field-label">Pick an Icon</label>
              <div className="emoji-grid">
                {BUCKET_EMOJIS.map((emoji) => (
                  <button
                    className={form.emoji === emoji ? "emoji-choice active" : "emoji-choice"}
                    type="button"
                    key={emoji}
                    onClick={() => setForm({ ...form, emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Pick a Color</label>
              <div className="color-grid">
                {BUCKET_COLORS.map((color) => (
                  <button
                    className={form.color === color ? "color-choice active" : "color-choice"}
                    type="button"
                    style={{ backgroundColor: color }}
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    aria-label={`Use ${color}`}
                  />
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
