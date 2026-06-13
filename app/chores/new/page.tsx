"use client";

import { AppShell, PageHeader } from "@/components/web/AppShell";
import { formatDefaultChoreReward, readDefaultChoreReward } from "@/lib/defaultChoreReward";
import { supabase } from "@/lib/supabase-browser";
import type { Family, RecurrencePeriod, User } from "@/types/database";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const RECURRENCE_OPTIONS: { label: string; value: RecurrencePeriod }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export default function NewChorePage() {
  const [children, setChildren] = useState<User[]>([]);
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("5.00");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadChildren() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      if (!authUser) return;
      const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
      if (!profile?.family_id) return;
      const [childrenResult, familyResult] = await Promise.all([
        supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child"),
        supabase.from("families").select("default_chore_reward").eq("id", profile.family_id).maybeSingle(),
      ]);

      const family = familyResult.data as Pick<Family, "default_chore_reward"> | null;
      if (family?.default_chore_reward != null) {
        const parsedReward = Number(family.default_chore_reward);
        if (Number.isFinite(parsedReward)) {
          setValue(formatDefaultChoreReward(parsedReward));
        }
      }

      const data = childrenResult.data;
      const nextChildren = (data as User[] | null) ?? [];
      setChildren(nextChildren);
      setChildId(nextChildren[0]?.id ?? "");
    }
    setValue(formatDefaultChoreReward(readDefaultChoreReward()));
    loadChildren();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const amount = Number(value);
    if (!title.trim()) return setError("Enter a chore title.");
    if (!childId) return setError("Choose a child.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter a valid reward.");

    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return setError("Sign in again.");
    const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
    if (!profile?.family_id) return setError("Create or join a family first.");

    const { error: insertError } = await supabase.from("chores").insert({
      family_id: profile.family_id,
      assigned_to_child_id: childId,
      title: title.trim(),
      value: amount,
      due_date: dueDate || null,
      status: "assigned",
      is_recurring: isRecurring,
      recurrence_period: isRecurring ? recurrencePeriod : null,
      source: "manual",
    });

    if (insertError) return setError(insertError.message);
    setTitle("");
    setDueDate("");
    setIsRecurring(false);
    setSuccess("Chore created.");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Chores"
        title="Create a Chore"
        description="Assign a task, reward amount, due date, and repeat schedule."
        action={<Link href="/chores" className="button ghost-button">All Chores</Link>}
      />
      <form className="card form-grid chore-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="title">Chore Title</label>
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="selection-group child-assignment">
          <div>
            <h2>Assign To</h2>
            <p>Choose who should see this chore on their dashboard.</p>
          </div>
          {children.length === 0 ? (
            <div className="inline-empty-state">
              <strong>No children yet</strong>
              <span>Add a child before creating chores.</span>
            </div>
          ) : (
            <div className="child-picker-grid" role="radiogroup" aria-label="Choose a child">
              {children.map((child) => {
                const selected = childId === child.id;
                return (
                  <button
                    aria-checked={selected}
                    className={selected ? "child-picker-option active" : "child-picker-option"}
                    key={child.id}
                    onClick={() => setChildId(child.id)}
                    role="radio"
                    type="button"
                  >
                    <span className="child-picker-avatar" aria-hidden="true">{child.avatar_emoji ?? "😊"}</span>
                    <span>
                      <strong>{child.name}</strong>
                      <small>{selected ? "Selected" : "Tap to assign"}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="value">Reward</label>
          <input id="value" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="due-date">Due Date</label>
          <input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={isRecurring} onChange={(event) => setIsRecurring(event.target.checked)} />
          <span>
            <strong>Recurring Chore</strong>
            <small>Creates a new copy after approval</small>
          </span>
        </label>
        {isRecurring ? (
          <div className="choice-chip-row">
            {RECURRENCE_OPTIONS.map((option) => (
              <button className={recurrencePeriod === option.value ? "choice-chip active" : "choice-chip"} type="button" key={option.value} onClick={() => setRecurrencePeriod(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p style={{ color: "var(--green)", fontWeight: 900 }}>{success}</p> : null}
        <button className="button" type="submit" disabled={children.length === 0}>Create Chore</button>
      </form>
    </AppShell>
  );
}
