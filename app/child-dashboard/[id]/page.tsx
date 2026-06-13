"use client";

import { LoadingScreen } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Bucket, BucketTemplate, Chore, Transaction, User } from "@/types/database";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ChildDashboardData = {
  child: User;
  templates: BucketTemplate[];
  buckets: Bucket[];
  chores: Chore[];
  transactions: Transaction[];
};

async function loadChildDashboard(childId: string): Promise<ChildDashboardData | null> {
  const { data: child } = await supabase.from("users").select("*").eq("id", childId).eq("role", "child").maybeSingle();
  if (!child?.family_id) return null;

  const [templatesResult, bucketsResult, choresResult, transactionsResult] = await Promise.all([
    supabase.from("bucket_templates").select("*").eq("family_id", child.family_id).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("buckets").select("*").eq("child_id", childId).order("year", { ascending: true }).order("month", { ascending: true }),
    supabase.from("chores").select("*").eq("assigned_to_child_id", childId).order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("child_id", childId).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    child: child as User,
    templates: (templatesResult.data as BucketTemplate[] | null) ?? [],
    buckets: (bucketsResult.data as Bucket[] | null) ?? [],
    chores: (choresResult.data as Chore[] | null) ?? [],
    transactions: (transactionsResult.data as Transaction[] | null) ?? [],
  };
}

export default function ChildDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const [data, setData] = useState<ChildDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadChildDashboard(childId);
    if (!nextData) {
      router.replace("/child-login");
      return;
    }
    setData(nextData);
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
  const assignedChores = (data?.chores ?? []).filter((chore) => chore.status === "assigned");

  async function markDone(chore: Chore) {
    setSaving(true);
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from("chores")
      .update({ status: "done" })
      .eq("id", chore.id)
      .eq("assigned_to_child_id", childId)
      .eq("status", "assigned");

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotice(`"${chore.title}" marked done.`);
    await refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/child-login");
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <main className="child-app">
      <header className="child-topbar">
        <Link href="/welcome" className="brand">
          <span className="brand-mark">💰</span>
          <span>FamFi Piggy Bank</span>
        </Link>
        <button className="ghost-button" type="button" onClick={signOut}>Sign Out</button>
      </header>

      <section className="child-dashboard">
        <article className="card child-hero-card">
          <div className="avatar jumbo">{data.child.avatar_emoji}</div>
          <p className="eyebrow">{data.child.name}&apos;s Total Savings</p>
          <div className="metric">${totalBalance.toFixed(2)}</div>
          <Link href={`/money-mentor/${data.child.id}`} className="button ghost-button">Ask Money Mentor</Link>
        </article>

        {notice ? <div className="notice success">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}

        <section className="card">
          <div className="section-title-row">
            <div>
              <h2>My Buckets</h2>
              <p>Money split by savings category.</p>
            </div>
          </div>
          <div className="child-bucket-grid">
            {data.templates.map((template) => (
              <div className="child-bucket-card" style={{ borderTopColor: template.color }} key={template.id}>
                <span>{template.emoji}</span>
                <strong>{template.name}</strong>
                <b>${(balances[template.id] ?? 0).toFixed(2)}</b>
              </div>
            ))}
          </div>
          {data.templates.length === 0 ? <p className="muted">No buckets yet.</p> : null}
        </section>

        <section className="card">
          <div className="section-title-row">
            <div>
              <h2>My Chores</h2>
              <p>Mark chores done when you finish them.</p>
            </div>
          </div>
          {assignedChores.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">🎉</div>
              <h3>All done</h3>
              <p className="muted">No active chores right now.</p>
            </div>
          ) : (
            <div className="chore-list">
              {assignedChores.map((chore) => (
                <article className="card chore-card child-chore-card" key={chore.id}>
                  <div>
                    <div className="chore-title-row">
                      <h3>{chore.title}</h3>
                      <span className="status-badge active">Earn ${Number(chore.value).toFixed(2)}</span>
                    </div>
                    <div className="chore-meta">
                      {chore.due_date ? <span>Due {new Date(chore.due_date).toLocaleDateString()}</span> : null}
                      {chore.is_recurring ? <span>Repeats {chore.recurrence_period}</span> : null}
                    </div>
                  </div>
                  <button className="button" type="button" onClick={() => markDone(chore)} disabled={saving}>
                    I Did It
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {data.transactions.length > 0 ? (
          <section className="card">
            <div className="section-title-row">
              <div>
                <h2>Recent Activity</h2>
                <p>Your latest piggy bank changes.</p>
              </div>
            </div>
            <div className="activity-card child-activity-card">
              {data.transactions.map((transaction) => {
                const positive = Number(transaction.amount) >= 0;
                return (
                  <div className="activity-row" key={transaction.id}>
                    <div className={`activity-icon ${positive ? "positive" : "negative"}`}>{positive ? "$" : "↘"}</div>
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
          </section>
        ) : null}
      </section>
    </main>
  );
}
