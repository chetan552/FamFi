"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Bucket, BucketTemplate, Transaction, User } from "@/types/database";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const CHILD_EMOJIS = ["😊", "😎", "🤩", "🦄", "🐼", "🦊", "🐯", "🧒", "👧", "👦", "🌟", "🚀"];

type ChildDetailData = {
  profile: User;
  child: User;
  templates: BucketTemplate[];
  buckets: Bucket[];
  transactions: Transaction[];
};

async function loadChildDetail(childId: string): Promise<ChildDetailData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [childResult, templatesResult, bucketsResult, transactionsResult] = await Promise.all([
    supabase.from("users").select("*").eq("id", childId).eq("family_id", profile.family_id).eq("role", "child").maybeSingle(),
    supabase.from("bucket_templates").select("*").eq("family_id", profile.family_id).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("buckets").select("*").eq("child_id", childId).order("year", { ascending: true }).order("month", { ascending: true }),
    supabase.from("transactions").select("*").eq("child_id", childId).order("created_at", { ascending: false }).limit(25),
  ]);

  if (!childResult.data) return null;
  return {
    profile: profile as User,
    child: childResult.data as User,
    templates: (templatesResult.data as BucketTemplate[] | null) ?? [],
    buckets: (bucketsResult.data as Bucket[] | null) ?? [],
    transactions: (transactionsResult.data as Transaction[] | null) ?? [],
  };
}

export default function ChildDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const [data, setData] = useState<ChildDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("😊");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadChildDetail(childId);
    if (!nextData) {
      router.replace("/children");
      return;
    }
    setData(nextData);
    setEditName(nextData.child.name);
    setEditEmoji(nextData.child.avatar_emoji);
    setLoading(false);
  }, [childId, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const balances = useMemo(() => {
    const next: Record<string, number> = {};
    for (const bucket of data?.buckets ?? []) {
      next[bucket.template_id] = (next[bucket.template_id] ?? 0) + Number(bucket.cached_balance || 0);
    }
    return next;
  }, [data?.buckets]);

  const totalBalance = Object.values(balances).reduce((sum, value) => sum + value, 0);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const name = editName.trim();
    if (!name) return setError("Enter a name.");

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({ name, avatar_emoji: editEmoji })
      .eq("id", data.child.id)
      .eq("family_id", data.profile.family_id)
      .eq("role", "child");

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditing(false);
    setNotice("Child profile updated.");
    await refresh();
  }

  async function removeChild() {
    if (!data) return;
    const confirmed = window.confirm(`Remove ${data.child.name}? This may fail if they already have chores, buckets, or transactions.`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", data.child.id)
      .eq("family_id", data.profile.family_id)
      .eq("role", "child");

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.replace("/children");
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Child Profile"
        title={data.child.name}
        description="Balances, buckets, and recent activity for this child."
        action={
          <div className="inline-actions">
            <Link href="/children" className="button ghost-button">All Children</Link>
            <button className="button" onClick={() => setEditing(true)}>Edit Profile</button>
          </div>
        }
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <section className="child-detail-grid">
        <article className="card child-hero-card">
          <div className="avatar jumbo">{data.child.avatar_emoji}</div>
          <p className="eyebrow">Total Piggy Bank Balance</p>
          <div className="metric">${totalBalance.toFixed(2)}</div>
          <div className="inline-actions">
            <Link href={`/withdraw?childId=${data.child.id}`} className="button">Record a Spend</Link>
            <Link href="/deposit-gift" className="button ghost-button">Give a Gift</Link>
          </div>
        </article>

        <article className="card">
          <div className="section-title-row">
            <div>
              <h2>Buckets</h2>
              <p>Current balance by bucket template.</p>
            </div>
          </div>
          {data.templates.length === 0 ? (
            <p className="muted">No buckets set up yet.</p>
          ) : (
            <div className="child-bucket-grid">
              {data.templates.map((template) => (
                <div className="child-bucket-card" style={{ borderTopColor: template.color }} key={template.id}>
                  <span>{template.emoji}</span>
                  <strong>{template.name}</strong>
                  <b>${(balances[template.id] ?? 0).toFixed(2)}</b>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <h2>Recent Activity</h2>
            <p>Latest deposits, withdrawals, payday, and interest.</p>
          </div>
          <Link href="/activity" className="text-link">All Activity</Link>
        </div>
        {data.transactions.length === 0 ? (
          <p className="muted">No transactions yet.</p>
        ) : (
          <div className="activity-card child-activity-card">
            {data.transactions.slice(0, 10).map((transaction) => {
              const positive = Number(transaction.amount) >= 0;
              return (
                <div className="activity-row" key={transaction.id}>
                  <div className={`activity-icon ${positive ? "positive" : "negative"}`}>
                    {transaction.type === "withdrawal" ? "↘" : "$"}
                  </div>
                  <div>
                    <strong>{transaction.description || transaction.type.replace("_", " ")}</strong>
                    <p className="muted">{new Date(transaction.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={positive ? "activity-amount positive" : "activity-amount negative"}>
                    {positive ? "+" : "-"}${Math.abs(Number(transaction.amount)).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="page-footer-actions">
        <button className="button danger-button" onClick={removeChild} disabled={saving}>Remove {data.child.name}</button>
      </div>

      {editing ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel form-grid" onSubmit={handleProfileSave}>
            <div className="modal-title-row">
              <h2>Edit Child</h2>
              <button className="icon-button" type="button" onClick={() => setEditing(false)} aria-label="Close profile form">×</button>
            </div>
            <div className="form-field">
              <label htmlFor="child-name">Name</label>
              <input id="child-name" value={editName} onChange={(event) => setEditName(event.target.value)} autoFocus />
            </div>
            <div>
              <label className="field-label">Avatar</label>
              <div className="emoji-grid">
                {CHILD_EMOJIS.map((emoji) => (
                  <button className={editEmoji === emoji ? "emoji-choice active" : "emoji-choice"} type="button" key={emoji} onClick={() => setEditEmoji(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="button ghost-button" type="button" onClick={() => setEditing(false)}>Cancel</button>
              <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
