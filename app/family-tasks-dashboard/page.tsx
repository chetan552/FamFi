"use client";

import { AppShell, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Chore, User } from "@/types/database";
import { useEffect, useState } from "react";

export default function FamilyTasksDashboardPage() {
  const [children, setChildren] = useState<User[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUser.id)
        .maybeSingle();
      if (!profile?.family_id) return;

      const [childrenResult, choresResult] = await Promise.all([
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
      ]);
      setChildren((childrenResult.data as User[] | null) ?? []);
      setChores((choresResult.data as Chore[] | null) ?? []);
    }
    load();
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Task Board"
        title="Family Tasks"
        description="A board for assigned, completed, approved, and paid chores."
      />
      <section
        className="grid"
        style={{ gridTemplateColumns: "repeat(4, minmax(220px, 1fr))" }}
      >
        {[
          ["assigned", "Assigned"],
          ["done", "Done"],
          ["approved", "Approved"],
          ["paid", "Paid"],
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
                  return (
                    <div
                      className="task-row"
                      key={chore.id}
                      style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
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
    </AppShell>
  );
}
