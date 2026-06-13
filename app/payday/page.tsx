"use client";

import { AppShell, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Chore, User } from "@/types/database";
import { useEffect, useMemo, useState } from "react";

export default function PaydayPage() {
  const [children, setChildren] = useState<User[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      if (!authUser) return;
      const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
      if (!profile?.family_id) return;
      const [childrenResult, choresResult] = await Promise.all([
        supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child"),
        supabase.from("chores").select("*").eq("family_id", profile.family_id).eq("status", "approved"),
      ]);
      setChildren((childrenResult.data as User[] | null) ?? []);
      setChores((choresResult.data as Chore[] | null) ?? []);
    }
    load();
  }, []);

  const paydayRows = useMemo(() => {
    return children
      .map((child) => {
        const childChores = chores.filter((chore) => chore.assigned_to_child_id === child.id);
        const total = childChores.reduce((sum, chore) => sum + Number(chore.value || 0), 0);
        return { child, childChores, total };
      })
      .filter((row) => row.total > 0);
  }, [children, chores]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Payday"
        title="Run Payday"
        description="Approved chores ready to be paid out."
      />
      <div className="grid">
        {paydayRows.length === 0 ? (
          <article className="card">
            <h2>No one is owed payday right now.</h2>
            <p className="muted">Approve completed chores first, then return here.</p>
          </article>
        ) : paydayRows.map(({ child, childChores, total }) => (
          <article className="card" key={child.id}>
            <div className="child-row">
              <div className="avatar">{child.avatar_emoji}</div>
              <div>
                <h2 style={{ margin: 0 }}>{child.name}</h2>
                <p className="muted" style={{ margin: "4px 0 0" }}>From {childChores.length} approved chore(s)</p>
              </div>
              <span className="amount-pill">${total.toFixed(2)}</span>
            </div>
            <button className="button" style={{ width: "100%", marginTop: 18 }}>Pay ${total.toFixed(2)} to {child.name}</button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
