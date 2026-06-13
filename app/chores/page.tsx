"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Chore, ChoreStatus, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ChoresData = {
  profile: User;
  children: User[];
  chores: Chore[];
};

const STATUS_META: Record<ChoreStatus, { label: string; section: string; className: string }> = {
  assigned: { label: "Active", section: "Active Chores", className: "active" },
  done: { label: "Needs Review", section: "Pending Review", className: "review" },
  approved: { label: "Pending Payment", section: "Approved for Payday", className: "approved" },
  paid: { label: "Paid", section: "Paid", className: "paid" },
};

async function loadChores(): Promise<ChoresData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!profile?.family_id) return null;

  const [childrenResult, choresResult] = await Promise.all([
    supabase
      .from("users")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("role", "child")
      .order("created_at", { ascending: true }),
    supabase
      .from("chores")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    profile: profile as User,
    children: (childrenResult.data as User[] | null) ?? [],
    chores: (choresResult.data as Chore[] | null) ?? [],
  };
}

export default function ChoresPage() {
  const router = useRouter();
  const [data, setData] = useState<ChoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadChores();
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

  const childById = useMemo(() => {
    return new Map((data?.children ?? []).map((child) => [child.id, child]));
  }, [data?.children]);

  const grouped = useMemo(() => {
    const groups: Record<ChoreStatus, Chore[]> = {
      done: [],
      assigned: [],
      approved: [],
      paid: [],
    };
    for (const chore of data?.chores ?? []) {
      groups[chore.status].push(chore);
    }
    return groups;
  }, [data?.chores]);

  const totals = useMemo(() => {
    const chores = data?.chores ?? [];
    return {
      all: chores.length,
      review: chores.filter((chore) => chore.status === "done").length,
      active: chores.filter((chore) => chore.status === "assigned").length,
      approved: chores.filter((chore) => chore.status === "approved").length,
    };
  }, [data?.chores]);

  async function approveChore(chore: Chore) {
    setSaving(true);
    setNotice(null);
    setError(null);

    const { error: updateError } = await supabase
      .from("chores")
      .update({ status: "approved" })
      .eq("id", chore.id)
      .eq("family_id", chore.family_id);

    if (!updateError && chore.is_recurring && chore.recurrence_period) {
      const nextDueDate = getNextDueDate(chore);
      await supabase.from("chores").insert({
        family_id: chore.family_id,
        assigned_to_child_id: chore.assigned_to_child_id,
        title: chore.title,
        value: chore.value,
        status: "assigned",
        due_date: nextDueDate,
        is_recurring: true,
        recurrence_period: chore.recurrence_period,
        source: chore.source,
        google_task_id: null,
      });
    }

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotice("Chore approved.");
    await refresh();
  }

  async function deleteChore(chore: Chore) {
    const confirmed = window.confirm(`Delete "${chore.title}"?`);
    if (!confirmed) return;

    setSaving(true);
    setNotice(null);
    setError(null);

    const { error: deleteError } = await supabase
      .from("chores")
      .delete()
      .eq("id", chore.id)
      .eq("family_id", chore.family_id);

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setNotice("Chore deleted.");
    await refresh();
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Chores"
        title="Family Chores"
        description={`${totals.all} total · ${totals.review} needs review · ${totals.approved} ready for payday`}
        action={
          <div className="inline-actions">
            <button className="button ghost-button" onClick={refresh} disabled={saving}>Refresh</button>
            <Link href="/chores/new" className="button">New Chore</Link>
          </div>
        }
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <section className="grid stats-grid chores-summary">
        <div className="stat-card card">
          <strong>{totals.active}</strong>
          <span>Active</span>
        </div>
        <div className="stat-card card">
          <strong>{totals.review}</strong>
          <span>Needs Review</span>
        </div>
        <div className="stat-card card">
          <strong>{totals.approved}</strong>
          <span>Approved</span>
        </div>
      </section>

      {data.chores.length === 0 ? (
        <section className="card empty-card page-empty">
          <div className="empty-icon">📋</div>
          <h2>No chores yet</h2>
          <p className="muted">Create chores to help your children earn rewards.</p>
          <Link href="/chores/new" className="button">Create First Chore</Link>
        </section>
      ) : (
        <section className="chores-board">
          {(["done", "assigned", "approved", "paid"] as ChoreStatus[]).map((status) => {
            const chores = grouped[status];
            if (chores.length === 0) return null;
            const meta = STATUS_META[status];
            return (
              <div className="chores-section" key={status}>
                <div className="section-title-row">
                  <div>
                    <p className="eyebrow">{meta.section}</p>
                    <h2>{chores.length} chore{chores.length === 1 ? "" : "s"}</h2>
                  </div>
                </div>
                <div className="chore-list">
                  {chores.map((chore) => {
                    const child = childById.get(chore.assigned_to_child_id);
                    return (
                      <article className={status === "done" ? "card chore-card review" : "card chore-card"} key={chore.id}>
                        <div>
                          <div className="chore-title-row">
                            <h3>{chore.title}</h3>
                            <span className={`status-badge ${meta.className}`}>{meta.label}</span>
                          </div>
                          <div className="chore-meta">
                            <span>{child?.avatar_emoji ?? "👤"} {child?.name ?? "Unknown"}</span>
                            {chore.due_date ? <span>Due {new Date(chore.due_date).toLocaleDateString()}</span> : null}
                            {chore.is_recurring ? <span>Repeats {chore.recurrence_period}</span> : null}
                            {chore.source === "google_tasks" ? <span>Google Tasks</span> : null}
                          </div>
                        </div>
                        <strong className="chore-value">${Number(chore.value).toFixed(2)}</strong>
                        <div className="inline-actions">
                          {chore.status === "done" ? (
                            <button className="button" onClick={() => approveChore(chore)} disabled={saving}>Approve</button>
                          ) : null}
                          {(chore.status === "assigned" || chore.status === "done") ? (
                            <Link className="button ghost-button" href={`/chores/edit/${chore.id}`}>Edit</Link>
                          ) : null}
                          {chore.status !== "paid" ? (
                            <button className="button danger-button" onClick={() => deleteChore(chore)} disabled={saving}>Delete</button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

function getNextDueDate(chore: Chore) {
  if (!chore.due_date || !chore.recurrence_period) return null;
  const date = new Date(`${chore.due_date}T00:00:00`);
  if (chore.recurrence_period === "daily") date.setDate(date.getDate() + 1);
  if (chore.recurrence_period === "weekly") date.setDate(date.getDate() + 7);
  if (chore.recurrence_period === "monthly") date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}
