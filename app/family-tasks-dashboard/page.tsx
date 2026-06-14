"use client";

import { AppShell, PageHeader } from "@/components/web/AppShell";
import Modal from "@/components/ui/Modal";
import { formatDefaultChoreReward, readDefaultChoreReward } from "@/lib/defaultChoreReward";
import { supabase } from "@/lib/supabase-browser";
import type { Chore, Family, RecurrencePeriod, User } from "@/types/database";
import { FormEvent, useCallback, useEffect, useState } from "react";

const RECURRENCE_OPTIONS: { label: string; value: RecurrencePeriod }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export default function FamilyTasksDashboardPage() {
  const [children, setChildren] = useState<User[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [defaultReward, setDefaultReward] = useState("5.00");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return;

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authUser.id)
      .maybeSingle();
    if (!profile?.family_id) return;

    const [childrenResult, choresResult, familyResult] = await Promise.all([
      supabase
        .from("users")
        .select("*")
        .eq("family_id", profile.family_id)
        .eq("role", "child"),
      supabase
        .from("chores")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("families")
        .select("default_chore_reward")
        .eq("id", profile.family_id)
        .maybeSingle(),
    ]);

    const family = familyResult.data as Pick<Family, "default_chore_reward"> | null;
    if (family?.default_chore_reward != null) {
      const parsed = Number(family.default_chore_reward);
      if (Number.isFinite(parsed)) {
        setDefaultReward(formatDefaultChoreReward(parsed));
      }
    }

    setChildren((childrenResult.data as User[] | null) ?? []);
    setChores((choresResult.data as Chore[] | null) ?? []);
  }, []);

  useEffect(() => {
    setDefaultReward(formatDefaultChoreReward(readDefaultChoreReward()));
    load();
  }, [load]);

  // --- create-chore modal state ---
  const [showModal, setShowModal] = useState(false);
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("5.00");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] =
    useState<RecurrencePeriod>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  function openModal() {
    setChildId(children[0]?.id ?? "");
    setTitle("");
    setValue(defaultReward);
    setDueDate("");
    setIsRecurring(false);
    setRecurrencePeriod("weekly");
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  async function handleStatusChange(choreId: string, newStatus: string) {
    setLoadingIds((prev) => new Set(prev).add(choreId));
    const { error } = await supabase
      .from("chores")
      .update({ status: newStatus })
      .eq("id", choreId);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(choreId);
      return next;
    });
    if (!error) await load();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const amount = Number(value);
    if (!title.trim()) return setError("Enter a chore title.");
    if (!childId) return setError("Choose a child.");
    if (!Number.isFinite(amount) || amount <= 0)
      return setError("Enter a valid reward.");

    setSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) {
      setSubmitting(false);
      return setError("Sign in again.");
    }
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authUser.id)
      .maybeSingle();
    if (!profile?.family_id) {
      setSubmitting(false);
      return setError("Create or join a family first.");
    }

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

    setSubmitting(false);
    if (insertError) return setError(insertError.message);

    closeModal();
    await load();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Chore Board"
        title="Family Chores"
        description="Track chores through assigned, done, and approved."
      />
      <section
        className="grid"
        style={{ gridTemplateColumns: "repeat(3, minmax(260px, 1fr))" }}
      >
        {[
          ["assigned", "Assigned"],
          ["done", "Done"],
          ["approved", "Approved"],
        ].map(([status, label]) => (
          <article className="card kanban-column" key={status}>
            <h2 style={{ marginTop: 0 }}>{label}</h2>
            <div className="task-list">
              {chores
                .filter((chore) => chore.status === status)
                .map((chore) => {
                  const child = children.find(
                    (item) => item.id === chore.assigned_to_child_id,
                  );
                  const isActionable =
                    chore.status === "assigned" || chore.status === "done";
                  const busy = loadingIds.has(chore.id);

                  return (
                    <div
                      className="task-row"
                      key={chore.id}
                      style={{
                        gridTemplateColumns: isActionable
                          ? "minmax(0, 1fr) auto auto"
                          : "minmax(0, 1fr) auto",
                      }}
                    >
                      <div>
                        <strong>{chore.title}</strong>
                        <p className="muted" style={{ margin: "4px 0 0" }}>
                          {child?.name ?? "Unassigned"}
                        </p>
                      </div>
                      <span className="amount-pill">
                        ${Number(chore.value).toFixed(2)}
                      </span>
                      {chore.status === "assigned" && (
                        <button
                          className="button-compact"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleStatusChange(chore.id, "done")
                          }
                        >
                          {busy ? "…" : "Done"}
                        </button>
                      )}
                      {chore.status === "done" && (
                        <button
                          className="button-compact"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            handleStatusChange(chore.id, "approved")
                          }
                        >
                          {busy ? "…" : "Approve"}
                        </button>
                      )}
                    </div>
                  );
                })}
              {chores.filter((chore) => chore.status === status).length ===
              0 ? (
                <p className="muted">No chores.</p>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {/* Floating add button */}
      {children.length > 0 && (
        <button
          className="fab"
          type="button"
          aria-label="Add chore"
          onClick={openModal}
        >
          +
        </button>
      )}

      {/* Create-chore modal */}
      {showModal && (
        <Modal title="Add Chore" onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="chore-title">Chore Title</label>
              <input
                id="chore-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {children.length > 0 && (
              <div className="selection-group" style={{ marginTop: 16 }}>
                <div className="child-picker-grid" role="radiogroup" aria-label="Choose a child">
                  {children.map((child) => {
                    const selected = childId === child.id;
                    return (
                      <button
                        aria-checked={selected}
                        className={
                          selected
                            ? "child-picker-option active"
                            : "child-picker-option"
                        }
                        key={child.id}
                        onClick={() => setChildId(child.id)}
                        role="radio"
                        type="button"
                      >
                        <span className="child-picker-avatar" aria-hidden="true">
                          {child.avatar_emoji ?? "😊"}
                        </span>
                        <span>
                          <strong>{child.name}</strong>
                          <small>
                            {selected ? "Selected" : "Tap to assign"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="chore-value">Reward</label>
              <input
                id="chore-value"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="chore-due">Due Date</label>
              <input
                id="chore-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <span>
                <strong>Recurring Chore</strong>
                <small>Creates a new copy after approval</small>
              </span>
            </label>

            {isRecurring && (
              <div className="choice-chip-row">
                {RECURRENCE_OPTIONS.map((option) => (
                  <button
                    className={
                      recurrencePeriod === option.value
                        ? "choice-chip active"
                        : "choice-chip"
                    }
                    type="button"
                    key={option.value}
                    onClick={() => setRecurrencePeriod(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <div className="modal-actions">
              <button
                className="button ghost-button"
                type="button"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="button"
                type="submit"
                disabled={submitting || children.length === 0}
              >
                {submitting ? "Creating…" : "Create Chore"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
