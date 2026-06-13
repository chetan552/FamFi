"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Chore, RecurrencePeriod, User } from "@/types/database";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

const RECURRENCE_OPTIONS: { label: string; value: RecurrencePeriod }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

type EditData = {
  chore: Chore;
  children: User[];
};

async function loadEditData(id: string): Promise<EditData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [choreResult, childrenResult] = await Promise.all([
    supabase.from("chores").select("*").eq("id", id).eq("family_id", profile.family_id).maybeSingle(),
    supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child").order("created_at", { ascending: true }),
  ]);

  if (!choreResult.data) return null;
  return {
    chore: choreResult.data as Chore,
    children: (childrenResult.data as User[] | null) ?? [],
  };
}

export default function EditChorePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const choreId = params.id;
  const [data, setData] = useState<EditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [childId, setChildId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>("weekly");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadEditData(choreId);
    if (!nextData) {
      router.replace("/chores");
      return;
    }
    setData(nextData);
    setTitle(nextData.chore.title);
    setValue(String(Number(nextData.chore.value).toFixed(2)));
    setChildId(nextData.chore.assigned_to_child_id);
    setDueDate(nextData.chore.due_date ?? "");
    setIsRecurring(nextData.chore.is_recurring);
    setRecurrencePeriod(nextData.chore.recurrence_period ?? "weekly");
    setLoading(false);
  }, [choreId, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(value);
    setError(null);

    if (!title.trim()) return setError("Enter a chore title.");
    if (!childId) return setError("Select a child.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter a reward greater than $0.");

    setSaving(true);
    const { error: updateError } = await supabase
      .from("chores")
      .update({
        title: title.trim(),
        value: Number(amount.toFixed(2)),
        assigned_to_child_id: childId,
        due_date: dueDate || null,
        is_recurring: isRecurring,
        recurrence_period: isRecurring ? recurrencePeriod : null,
      })
      .eq("id", choreId);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/chores");
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Chores"
        title="Edit Chore"
        description={data.chore.status === "paid" ? "Paid chores are shown for history. Edit unpaid chores only." : "Update assignment, reward, due date, and recurrence."}
        action={<Link href="/chores" className="button ghost-button">Back to Chores</Link>}
      />

      <form className="card form-grid chore-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="title">Chore Title</label>
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={data.chore.status === "paid"} />
        </div>
        <div className="form-field">
          <label htmlFor="value">Reward</label>
          <input id="value" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} disabled={data.chore.status === "paid"} />
        </div>
        <div className="form-field">
          <label htmlFor="due-date">Due Date</label>
          <input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={data.chore.status === "paid"} />
        </div>

        <div className="selection-group">
          <h2>Assign To</h2>
          <div className="choice-chip-row">
            {data.children.map((child) => (
              <button className={childId === child.id ? "choice-chip active" : "choice-chip"} type="button" key={child.id} onClick={() => setChildId(child.id)} disabled={data.chore.status === "paid"}>
                {child.avatar_emoji} {child.name}
              </button>
            ))}
          </div>
        </div>

        <label className="toggle-row">
          <input type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} disabled={data.chore.status === "paid"} />
          <span>
            <strong>Recurring Chore</strong>
            <small>Creates a new copy after each approval</small>
          </span>
        </label>

        {isRecurring ? (
          <div className="choice-chip-row">
            {RECURRENCE_OPTIONS.map((option) => (
              <button className={recurrencePeriod === option.value ? "choice-chip active" : "choice-chip"} type="button" key={option.value} onClick={() => setRecurrencePeriod(option.value)} disabled={data.chore.status === "paid"}>
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="inline-actions">
          <Link href="/chores" className="button ghost-button">Cancel</Link>
          <button className="button" type="submit" disabled={saving || data.chore.status === "paid"}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </AppShell>
  );
}
