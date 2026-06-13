"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Bucket, BucketTemplate, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type WithdrawData = {
  profile: User;
  children: User[];
  templates: BucketTemplate[];
  buckets: Bucket[];
};

async function loadWithdrawData(): Promise<WithdrawData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [childrenResult, templatesResult] = await Promise.all([
    supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child").order("created_at", { ascending: true }),
    supabase.from("bucket_templates").select("*").eq("family_id", profile.family_id).eq("is_active", true).order("sort_order", { ascending: true }),
  ]);

  const children = (childrenResult.data as User[] | null) ?? [];
  const childIds = children.map((child) => child.id);
  const { data: buckets } = childIds.length > 0
    ? await supabase.from("buckets").select("*").in("child_id", childIds).order("year", { ascending: true }).order("month", { ascending: true })
    : { data: [] };

  return {
    profile: profile as User,
    children,
    templates: (templatesResult.data as BucketTemplate[] | null) ?? [],
    buckets: (buckets as Bucket[] | null) ?? [],
  };
}

export default function WithdrawPage() {
  const router = useRouter();
  const [data, setData] = useState<WithdrawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childId, setChildId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadWithdrawData();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    setChildId((current) => current || nextData.children[0]?.id || "");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const preselectedChildId = new URLSearchParams(window.location.search).get("childId");
    if (preselectedChildId) setChildId(preselectedChildId);
  }, []);

  useEffect(() => {
    setTemplateId("");
    setAmount("");
    setError(null);
  }, [childId]);

  const balances = useMemo(() => {
    const next: Record<string, number> = {};
    for (const bucket of data?.buckets ?? []) {
      next[`${bucket.child_id}:${bucket.template_id}`] = (next[`${bucket.child_id}:${bucket.template_id}`] ?? 0) + Number(bucket.cached_balance || 0);
    }
    return next;
  }, [data?.buckets]);

  const bucketsWithBalance = useMemo(() => {
    if (!data || !childId) return [];
    return data.templates.filter((template) => (balances[`${childId}:${template.id}`] ?? 0) > 0);
  }, [balances, childId, data]);

  const selectedBalance = childId && templateId ? balances[`${childId}:${templateId}`] ?? 0 : 0;
  const selectedChild = data?.children.find((child) => child.id === childId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;

    const value = Number(amount);
    setError(null);
    setNotice(null);

    if (!childId) return setError("Select a child.");
    if (!templateId) return setError("Select a bucket.");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than $0.");
    if (value > selectedBalance) return setError(`Amount exceeds available balance of $${selectedBalance.toFixed(2)}.`);

    const sourceBuckets = data.buckets
      .filter((bucket) => bucket.child_id === childId && bucket.template_id === templateId && Number(bucket.cached_balance || 0) > 0)
      .sort((a, b) => a.year - b.year || a.month - b.month);

    let remaining = Number(value.toFixed(2));
    const withdrawals = [];
    for (const bucket of sourceBuckets) {
      if (remaining <= 0) break;
      const bucketBalance = Number(bucket.cached_balance || 0);
      const withdrawalAmount = Math.min(bucketBalance, remaining);
      withdrawals.push({
        bucket_id: bucket.id,
        child_id: childId,
        amount: -Number(withdrawalAmount.toFixed(2)),
        type: "withdrawal",
        description: description.trim() || "Withdrawal",
        status: "completed",
      });
      remaining = Number((remaining - withdrawalAmount).toFixed(2));
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("transactions").insert(withdrawals);
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAmount("");
    setDescription("");
    setNotice(`$${value.toFixed(2)} withdrawn.`);
    await refresh();
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Money Movement"
        title="Record a Spend"
        description="Deduct money from a child's bucket when they spend it."
        action={<Link href="/activity" className="button ghost-button">Activity</Link>}
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <form className="card form-grid money-form" onSubmit={handleSubmit}>
        <SelectionGroup title="1. Which Child?">
          {data.children.map((child) => (
            <button className={childId === child.id ? "choice-chip active" : "choice-chip"} type="button" key={child.id} onClick={() => setChildId(child.id)}>
              {child.avatar_emoji} {child.name}
            </button>
          ))}
        </SelectionGroup>

        {childId ? (
          <SelectionGroup title="2. From Which Bucket?">
            {bucketsWithBalance.length === 0 ? (
              <p className="muted">{selectedChild?.name ?? "This child"} has no savings to withdraw from yet.</p>
            ) : bucketsWithBalance.map((template) => (
              <button className={templateId === template.id ? "choice-chip active" : "choice-chip"} type="button" key={template.id} onClick={() => setTemplateId(template.id)}>
                {template.emoji} {template.name} · ${(balances[`${childId}:${template.id}`] ?? 0).toFixed(2)}
              </button>
            ))}
          </SelectionGroup>
        ) : null}

        {templateId ? (
          <div className="balance-callout">
            <span>Available balance</span>
            <strong>${selectedBalance.toFixed(2)}</strong>
          </div>
        ) : null}

        <div className="form-field">
          <label htmlFor="withdraw-amount">Amount to Withdraw</label>
          <input id="withdraw-amount" inputMode="decimal" placeholder="5.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="withdraw-description">What was it for?</label>
          <input id="withdraw-description" placeholder="Snacks, toy, school supplies..." value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <button className="button" type="submit" disabled={saving || !childId || !templateId || bucketsWithBalance.length === 0}>
          {saving ? "Recording..." : "Confirm Withdrawal"}
        </button>
      </form>
    </AppShell>
  );
}

function SelectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="selection-group">
      <h2>{title}</h2>
      <div className="choice-chip-row">{children}</div>
    </div>
  );
}
