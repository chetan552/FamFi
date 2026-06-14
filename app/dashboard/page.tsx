"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { BucketTemplate, Chore, Family, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const SETUP_DISMISSED_KEY = "famfi-setup-checklist-dismissed";

type DashboardData = {
  profile: User;
  family: Family | null;
  children: User[];
  parents: User[];
  chores: Chore[];
  bucketTemplates: BucketTemplate[];
  childBalances: Record<string, number>;
};

async function loadDashboard(): Promise<DashboardData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!profile?.family_id) return null;

  const [
    familyResult,
    childrenResult,
    parentsResult,
    choresResult,
    templatesResult,
    balancesResult,
  ] = await Promise.all([
    supabase
      .from("families")
      .select("*")
      .eq("id", profile.family_id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("role", "child")
      .order("created_at", { ascending: true }),
    supabase
      .from("users")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("role", "parent")
      .order("created_at", { ascending: true }),
    supabase
      .from("chores")
      .select("*")
      .eq("family_id", profile.family_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bucket_templates")
      .select("*")
      .eq("family_id", profile.family_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.rpc("get_family_bucket_balances"),
  ]);

  const childBalances: Record<string, number> = {};
  for (const row of (balancesResult.data ?? []) as {
    child_id: string;
    balance: number | string;
  }[]) {
    childBalances[row.child_id] =
      (childBalances[row.child_id] ?? 0) + (Number(row.balance) || 0);
  }

  return {
    profile: profile as User,
    family: (familyResult.data as Family | null) ?? null,
    children: (childrenResult.data as User[] | null) ?? [],
    parents: (parentsResult.data as User[] | null) ?? [],
    chores: (choresResult.data as Chore[] | null) ?? [],
    bucketTemplates: (templatesResult.data as BucketTemplate[] | null) ?? [],
    childBalances,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    const nextData = await loadDashboard();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    let active = true;

    loadDashboard().then((nextData) => {
      if (!active) return;
      if (!nextData) {
        router.replace("/welcome");
        return;
      }
      setData(nextData);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setSetupDismissed(localStorage.getItem(SETUP_DISMISSED_KEY) === "true");
  }, []);

  const totals = useMemo(() => {
    const familyTotal =
      data?.children.reduce(
        (sum, child) => sum + (data.childBalances[child.id] ?? 0),
        0,
      ) ?? 0;
    const activeChores =
      data?.chores.filter((chore) => chore.status !== "paid").length ?? 0;
    const pendingReview =
      data?.chores.filter((chore) => chore.status === "done").length ?? 0;
    return { familyTotal, activeChores, pendingReview };
  }, [data]);

  const setupSteps = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Add your first child",
        done: data.children.length > 0,
        href: "/children",
      },
      {
        label: "Set up savings buckets",
        done: data.bucketTemplates.length > 0,
        href: "/bucket-templates",
      },
      {
        label: "Create your first chore",
        done: data.chores.length > 0,
        href: "/chores/new",
      },
    ];
  }, [data]);

  const completedSetupSteps = setupSteps.filter((step) => step.done).length;
  const showSetupChecklist =
    !setupDismissed && completedSetupSteps < setupSteps.length;

  useEffect(() => {
    if (
      setupSteps.length > 0 &&
      completedSetupSteps === setupSteps.length &&
      !setupDismissed
    ) {
      localStorage.setItem(SETUP_DISMISSED_KEY, "true");
      setSetupDismissed(true);
    }
  }, [completedSetupSteps, setupDismissed, setupSteps.length]);

  const dismissSetup = () => {
    localStorage.setItem(SETUP_DISMISSED_KEY, "true");
    setSetupDismissed(true);
  };

  if (loading || !data) return <LoadingScreen />;

  const pendingReviewChores = data.chores
    .filter((chore) => chore.status === "done")
    .slice(0, 5);
  const quickActions = [
    {
      label: "Chores",
      icon: "🧹",
      href: "/chores",
      detail:
        totals.pendingReview > 0
          ? `${totals.pendingReview} need review`
          : "Create and assign work",
      enabled: true,
    },
    {
      label: "Payday",
      icon: "💸",
      href: "/payday",
      detail: "Pay approved chores",
      enabled: true,
    },
    {
      label: "Chore Board",
      icon: "📋",
      href: "/family-tasks-dashboard",
      detail: "Review every child",
      enabled: true,
    },
    {
      label: "Gift",
      icon: "🎁",
      href: "/deposit-gift",
      detail: "Deposit gift money",
      enabled: true,
    },
    {
      label: "Withdraw",
      icon: "🏦",
      href: "/withdraw",
      detail: "Record spending",
      enabled: true,
    },
    {
      label: "Interest",
      icon: "%",
      href: "/interest-settings",
      detail: "Credit growth",
      enabled: true,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          data.family
            ? `${data.family.name} Family Piggy Bank`
            : "Family Piggy Bank"
        }
        title={`Hi, ${data.profile.name}`}
        description="An overview of children, chores, payday, and savings buckets."
        action={
          <div className="inline-actions">
            <button
              className="button ghost-button"
              onClick={refreshDashboard}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link href="/chores/new" className="button">
              New Chore
            </Link>
          </div>
        }
      />

      <section className="grid dashboard-grid">
        <div className="grid">
          <article className="card hero-card">
            <p className="eyebrow">Family Piggy Bank Savings</p>
            <div className="metric">${totals.familyTotal.toFixed(2)}</div>
            <p className="metric-label">Total Family Savings</p>
            <div className="grid stats-grid dashboard-stats">
              <div className="stat-card">
                <strong>{data.children.length}</strong>
                <span>Children</span>
              </div>
              <div className="stat-card">
                <strong>{totals.activeChores}</strong>
                <span>Active Chores</span>
              </div>
              <div className="stat-card">
                <strong>{totals.pendingReview}</strong>
                <span>Needs Review</span>
              </div>
            </div>
          </article>

          {showSetupChecklist ? (
            <article className="card setup-card">
              <div className="setup-header">
                <div>
                  <p className="eyebrow">Quick Setup</p>
                  <h2>
                    Get Started ({completedSetupSteps}/{setupSteps.length})
                  </h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={dismissSetup}
                  aria-label="Dismiss setup checklist"
                >
                  ×
                </button>
              </div>
              <div className="setup-progress" aria-hidden="true">
                <span
                  style={{
                    width: `${(completedSetupSteps / setupSteps.length) * 100}%`,
                  }}
                />
              </div>
              <div className="setup-step-list">
                {setupSteps.map((step) =>
                  step.done ? (
                    <div className="setup-step done" key={step.label}>
                      <span>✓</span>
                      <strong>{step.label}</strong>
                    </div>
                  ) : (
                    <Link
                      className="setup-step"
                      href={step.href}
                      key={step.label}
                    >
                      <span>○</span>
                      <strong>{step.label}</strong>
                    </Link>
                  ),
                )}
              </div>
            </article>
          ) : null}

          <article className="card">
            <div className="section-title-row">
              <div>
                <h2>Children</h2>
                <p>Balances are calculated from bucket transactions.</p>
              </div>
              <Link href="/children" className="text-link">
                Manage
              </Link>
            </div>
            <div className="children-list">
              {data.children.length === 0 ? (
                <div className="empty-card">
                  <div className="empty-icon">👧</div>
                  <h3>No children yet</h3>
                  <p className="muted">
                    Add children so they can earn rewards, split payday, and
                    watch savings grow.
                  </p>
                  <Link href="/children" className="button">
                    Add Children
                  </Link>
                </div>
              ) : (
                data.children.map((child) => (
                  <Link
                    className="child-row"
                    href={`/children/${child.id}`}
                    key={child.id}
                  >
                    <div className="avatar">{child.avatar_emoji}</div>
                    <div>
                      <strong>{child.name}</strong>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        {
                          data.chores.filter(
                            (chore) =>
                              chore.assigned_to_child_id === child.id &&
                              chore.status === "assigned",
                          ).length
                        }{" "}
                        active chores
                      </p>
                    </div>
                    <span className="amount-pill">
                      ${(data.childBalances[child.id] ?? 0).toFixed(2)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </article>

          <article className="card">
            <div className="section-title-row">
              <div>
                <h2>Quick Actions</h2>
                <p>Common parent workflows from the Flutter dashboard.</p>
              </div>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action) =>
                action.enabled && action.href ? (
                  <Link
                    href={action.href}
                    className="quick-action-card"
                    key={action.label}
                  >
                    <span className="quick-action-icon">{action.icon}</span>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </Link>
                ) : (
                  <button
                    className="quick-action-card disabled"
                    type="button"
                    disabled
                    key={action.label}
                  >
                    <span className="quick-action-icon">{action.icon}</span>
                    <strong>{action.label}</strong>
                    <small>{action.detail} · Coming next</small>
                  </button>
                ),
              )}
            </div>
          </article>
        </div>

        <aside className="grid">
          <article className="card">
            <div className="section-title-row">
              <div>
                <h2>Savings Buckets</h2>
                <p>Active family bucket templates.</p>
              </div>
              <Link href="/bucket-templates" className="text-link">
                Edit
              </Link>
            </div>
            <div className="bucket-chips">
              {data.bucketTemplates.length === 0 ? (
                <p className="muted">No buckets configured.</p>
              ) : (
                data.bucketTemplates.map((bucket) => (
                  <span
                    className="bucket-chip"
                    style={{ borderColor: bucket.color }}
                    key={bucket.id}
                  >
                    {bucket.emoji} {bucket.name}
                  </span>
                ))
              )}
            </div>
          </article>

          <article className="card">
            <div className="section-title-row">
              <div>
                <h2>Review Queue</h2>
                <p>Done chores waiting for approval.</p>
              </div>
              <Link href="/family-tasks-dashboard" className="text-link">
                Open Board
              </Link>
            </div>
            <div className="task-list">
              {pendingReviewChores.map((chore) => (
                <div className="task-row" key={chore.id}>
                  <span className="status-pill">Done</span>
                  <strong>{chore.title}</strong>
                  <span className="amount-pill">
                    ${Number(chore.value).toFixed(2)}
                  </span>
                </div>
              ))}
              {totals.pendingReview === 0 ? (
                <p className="muted">No chores need review.</p>
              ) : null}
            </div>
          </article>

          <article className="card">
            <div className="section-title-row">
              <div>
                <h2>Parents</h2>
                <p>Adults connected to this family.</p>
              </div>
            </div>
            <div className="parents-list">
              {data.parents.map((parent) => (
                <div className="parent-row" key={parent.id}>
                  <div className="avatar small">{parent.avatar_emoji}</div>
                  <div>
                    <strong>
                      {parent.name}
                      {parent.id === data.profile.id ? " (You)" : ""}
                    </strong>
                    <p className="muted">Parent</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
