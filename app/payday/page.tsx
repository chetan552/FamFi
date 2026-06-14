"use client";

import { AppShell, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { BucketTemplate, Chore, User } from "@/types/database";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function PaydayPage() {
  const [children, setChildren] = useState<User[]>([]);
  const [approvedChores, setApprovedChores] = useState<Chore[]>([]);
  const [paidChores, setPaidChores] = useState<Chore[]>([]);
  const [templates, setTemplates] = useState<BucketTemplate[]>([]);
  const [distributions, setDistributions] = useState<
    Record<string, string>
  >({});
  const [paidChildren, setPaidChildren] = useState<Set<string>>(new Set());
  const [processingChildId, setProcessingChildId] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    const [childrenResult, approvedResult, paidResult, templatesResult] =
      await Promise.all([
        supabase
          .from("users")
          .select("*")
          .eq("family_id", profile.family_id)
          .eq("role", "child"),
        supabase
          .from("chores")
          .select("*")
          .eq("family_id", profile.family_id)
          .eq("status", "approved"),
        supabase
          .from("chores")
          .select("*")
          .eq("family_id", profile.family_id)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("bucket_templates")
          .select("*")
          .eq("family_id", profile.family_id)
          .eq("is_active", true)
          .order("sort_order"),
      ]);

    setChildren((childrenResult.data as User[] | null) ?? []);
    setApprovedChores((approvedResult.data as Chore[] | null) ?? []);
    setPaidChores((paidResult.data as Chore[] | null) ?? []);
    setTemplates((templatesResult.data as BucketTemplate[] | null) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const paydayRows = useMemo(() => {
    return children
      .map((child) => {
        const childChores = approvedChores.filter(
          (chore) => chore.assigned_to_child_id === child.id,
        );
        const total = childChores.reduce(
          (sum, chore) => sum + Number(chore.value || 0),
          0,
        );
        return { child, childChores, total };
      })
      .filter((row) => row.total > 0);
  }, [children, approvedChores]);

  // Initialize distributions with equal splits when rows or templates change
  useEffect(() => {
    if (templates.length === 0) return;
    const next: Record<string, string> = {};
    for (const row of paydayRows) {
      const split = row.total / templates.length;
      let allocated = 0;
      for (let i = 0; i < templates.length; i++) {
        const tId = templates[i].id;
        const key = `${row.child.id}_${tId}`;
        if (i === templates.length - 1) {
          next[key] = (row.total - allocated).toFixed(2);
        } else {
          next[key] = split.toFixed(2);
          allocated += parseFloat(split.toFixed(2));
        }
      }
    }
    setDistributions(next);
  }, [paydayRows, templates]);

  async function handlePay(
    childId: string,
    childName: string,
    total: number,
    choreIds: string[],
  ) {
    if (templates.length === 0) {
      setErrors((prev) => ({
        ...prev,
        [childId]: "No savings buckets configured.",
      }));
      return;
    }

    // Validate distribution totals
    let calculatedTotal = 0;
    const numberDist: Record<string, number> = {};
    for (const t of templates) {
      const key = `${childId}_${t.id}`;
      const val = parseFloat(distributions[key] ?? "0") || 0;
      calculatedTotal += val;
      numberDist[t.id] = val;
    }

    if (Math.abs(calculatedTotal - total) > 0.01) {
      setErrors((prev) => ({
        ...prev,
        [childId]: `Distribution must equal $${total.toFixed(
          2,
        )}. Current: $${calculatedTotal.toFixed(2)}`,
      }));
      return;
    }

    setProcessingChildId(childId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });

    try {
      // Get or create buckets for each template for the current month/year
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const bucketAmounts: { bucket_id: string; amount: number }[] = [];

      for (const t of templates) {
        const amount = numberDist[t.id];
        if (amount <= 0) continue;

        // Check if bucket exists for this child+template+month+year
        const { data: existing } = await supabase
          .from("buckets")
          .select("id")
          .eq("child_id", childId)
          .eq("template_id", t.id)
          .eq("month", month)
          .eq("year", year)
          .maybeSingle();

        let bucketId: string;
        if (existing) {
          bucketId = existing.id as string;
        } else {
          const { data: newBucket, error: createError } = await supabase
            .from("buckets")
            .insert({
              child_id: childId,
              template_id: t.id,
              month,
              year,
              cached_balance: 0,
            })
            .select("id")
            .single();

          if (createError || !newBucket) {
            throw new Error(
              `Failed to create bucket for ${t.name}: ${createError?.message}`,
            );
          }
          bucketId = newBucket.id as string;
        }

        bucketAmounts.push({ bucket_id: bucketId, amount });
      }

      // Call the process_payday RPC
      const { error: rpcError } = await supabase.rpc("process_payday", {
        p_child_id: childId,
        p_bucket_amounts: bucketAmounts,
        p_chore_ids: choreIds,
      });

      if (rpcError) throw new Error(rpcError.message);

      setPaidChildren((prev) => new Set(prev).add(childId));
      await load();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "An unexpected error occurred.";
      setErrors((prev) => ({ ...prev, [childId]: msg }));
    } finally {
      setProcessingChildId(null);
    }
  }

  const paidRows = useMemo(() => {
    return children
      .map((child) => {
        const childChores = paidChores.filter(
          (chore) => chore.assigned_to_child_id === child.id,
        );
        const total = childChores.reduce(
          (sum, chore) => sum + Number(chore.value || 0),
          0,
        );
        return { child, childChores, total };
      })
      .filter((row) => row.childChores.length > 0);
  }, [children, paidChores]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Payday"
        title="Run Payday"
        description="Distribute approved chore earnings across savings buckets."
      />

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ margin: "0 0 16px" }}>Ready to Pay</h2>
        {paydayRows.length === 0 ? (
          <article className="card">
            <h2>No one is owed payday right now.</h2>
            <p className="muted">
              Approve completed chores on the Chore Board first, then return
              here.
            </p>
          </article>
        ) : (
          <div className="grid">
            {paydayRows.map(({ child, childChores, total }) => {
              const isPaid = paidChildren.has(child.id);
              const isProcessing = processingChildId === child.id;
              const childError = errors[child.id];

              return (
                <article
                  className="card"
                  key={child.id}
                  style={
                    isPaid ? { opacity: 0.65 } : undefined
                  }
                >
                  <div className="child-row">
                    <div className="avatar">{child.avatar_emoji}</div>
                    <div>
                      <h2 style={{ margin: 0 }}>
                        {child.name}
                        {isPaid ? (
                          <span
                            style={{
                              color: "var(--green)",
                              marginLeft: 8,
                              fontSize: 14,
                            }}
                          >
                            Paid
                          </span>
                        ) : null}
                      </h2>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        {childChores.length} approved chore
                        {childChores.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="amount-pill">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  {templates.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p
                        className="muted"
                        style={{ fontSize: 13, margin: "0 0 10px" }}
                      >
                        Split across buckets:
                      </p>
                      {templates.map((t) => {
                        const key = `${child.id}_${t.id}`;
                        return (
                          <div
                            key={t.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: t.color || "var(--primary)",
                                flex: "none",
                              }}
                            />
                            <span
                              style={{
                                flex: 1,
                                fontSize: 14,
                                fontWeight: 500,
                              }}
                            >
                              {t.emoji} {t.name}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={isPaid || isProcessing}
                              value={distributions[key] ?? "0.00"}
                              onChange={(e) => {
                                const next = {
                                  ...distributions,
                                  [key]: e.target.value,
                                };
                                setDistributions(next);
                                if (errors[child.id]) {
                                  setErrors((prev) => {
                                    const n = { ...prev };
                                    delete n[child.id];
                                    return n;
                                  });
                                }
                              }}
                              style={{
                                width: 90,
                                textAlign: "right",
                                padding: "6px 8px",
                                fontSize: 14,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {childError && (
                    <p className="error-text" style={{ marginTop: 12 }}>
                      {childError}
                    </p>
                  )}

                  {!isPaid && (
                    <button
                      className="button"
                      style={{ width: "100%", marginTop: 16 }}
                      disabled={isProcessing || templates.length === 0}
                      onClick={() =>
                        handlePay(
                          child.id,
                          child.name,
                          total,
                          childChores.map((c) => c.id),
                        )
                      }
                    >
                      {isProcessing
                        ? "Processing…"
                        : `Pay $${total.toFixed(2)} to ${child.name}`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Paid history */}
      <section>
        <h2 style={{ margin: "0 0 16px" }}>Paid History</h2>
        {paidRows.length === 0 ? (
          <article className="card">
            <p className="muted">No paid chores yet.</p>
          </article>
        ) : (
          <div className="grid">
            {paidRows.map(({ child, childChores, total }) => (
              <article className="card" key={`paid-${child.id}`}>
                <div className="child-row">
                  <div className="avatar">{child.avatar_emoji}</div>
                  <div>
                    <h2 style={{ margin: 0 }}>{child.name}</h2>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      {childChores.length} paid chore
                      {childChores.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="amount-pill">${total.toFixed(2)}</span>
                </div>
                <ul
                  style={{
                    margin: "12px 0 0",
                    padding: "0 0 0 18px",
                    fontSize: 14,
                    color: "var(--muted)",
                  }}
                >
                  {childChores.slice(0, 8).map((chore) => (
                    <li key={chore.id} style={{ marginBottom: 4 }}>
                      {chore.title} — ${Number(chore.value).toFixed(2)}
                    </li>
                  ))}
                  {childChores.length > 8 && (
                    <li>+ {childChores.length - 8} more</li>
                  )}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
