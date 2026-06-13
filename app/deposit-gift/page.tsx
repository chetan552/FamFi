"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { BucketTemplate, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type GiftData = {
  profile: User;
  children: User[];
  templates: BucketTemplate[];
};

async function loadGiftData(): Promise<GiftData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [childrenResult, templatesResult] = await Promise.all([
    supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child").order("created_at", { ascending: true }),
    supabase.from("bucket_templates").select("*").eq("family_id", profile.family_id).eq("is_active", true).order("sort_order", { ascending: true }),
  ]);

  return {
    profile: profile as User,
    children: (childrenResult.data as User[] | null) ?? [],
    templates: (templatesResult.data as BucketTemplate[] | null) ?? [],
  };
}

async function getOrCreateBucket(childId: string, templateId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data } = await supabase
    .from("buckets")
    .select("id")
    .eq("child_id", childId)
    .eq("template_id", templateId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (data?.id) return data.id as string;

  const { data: bucket, error } = await supabase
    .from("buckets")
    .insert({ child_id: childId, template_id: templateId, month, year })
    .select("id")
    .single();

  if (error) throw error;
  return bucket.id as string;
}

export default function DepositGiftPage() {
  const router = useRouter();
  const [data, setData] = useState<GiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [childId, setChildId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Birthday Gift");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadGiftData();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    setChildId((current) => current || nextData.children[0]?.id || "");
    setTemplateId((current) => current || nextData.templates[0]?.id || "");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    setError(null);
    setNotice(null);

    if (!childId) return setError("Select a child.");
    if (!templateId) return setError("Select a bucket.");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a gift amount greater than $0.");

    setSaving(true);
    try {
      const bucketId = await getOrCreateBucket(childId, templateId);
      const { error: insertError } = await supabase.from("transactions").insert({
        bucket_id: bucketId,
        child_id: childId,
        amount: Number(value.toFixed(2)),
        type: "gift",
        description: description.trim() || "Gift",
        status: "completed",
      });
      if (insertError) throw insertError;
      setAmount("");
      setNotice(`Gift of $${value.toFixed(2)} deposited.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not deposit gift.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) return <LoadingScreen />;
  const prerequisitesMissing = data.children.length === 0 || data.templates.length === 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Money Movement"
        title="Give a Gift"
        description="Deposit one-time gift money into a child's savings bucket."
        action={<Link href="/activity" className="button ghost-button">Activity</Link>}
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <form className="card form-grid money-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="amount">Amount</label>
          <input id="amount" inputMode="decimal" placeholder="50.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="description">Note</label>
          <input id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <SelectionGroup title="To Child">
          {data.children.map((child) => (
            <button className={childId === child.id ? "choice-chip active" : "choice-chip"} type="button" key={child.id} onClick={() => setChildId(child.id)}>
              {child.avatar_emoji} {child.name}
            </button>
          ))}
        </SelectionGroup>

        <SelectionGroup title="Into Bucket">
          {data.templates.map((template) => (
            <button className={templateId === template.id ? "choice-chip active" : "choice-chip"} type="button" key={template.id} onClick={() => setTemplateId(template.id)}>
              {template.emoji} {template.name}
            </button>
          ))}
        </SelectionGroup>

        {prerequisitesMissing ? (
          <p className="error-text">Add at least one child and one bucket before depositing gifts.</p>
        ) : null}

        <button className="button" type="submit" disabled={saving || prerequisitesMissing}>
          {saving ? "Depositing..." : "Deposit Gift"}
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
