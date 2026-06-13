"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Transaction, TransactionType, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type FilterType = "all" | "chore_earning" | "gift" | "withdrawal" | "interest" | "parent_match";

type ActivityData = {
  children: User[];
  transactions: Transaction[];
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "chore_earning", label: "Chores" },
  { key: "gift", label: "Gifts" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "interest", label: "Interest" },
  { key: "parent_match", label: "Match" },
];

function typeLabel(type: TransactionType) {
  if (type === "chore_earning") return "Chore Earning";
  if (type === "parent_match") return "Parent Match";
  return type.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function loadActivity(): Promise<ActivityData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [childrenResult, transactionsResult] = await Promise.all([
    supabase.from("users").select("*").eq("family_id", profile.family_id).eq("role", "child").order("created_at", { ascending: true }),
    supabase.rpc("get_family_recent_transactions", { p_limit: 200 }),
  ]);

  return {
    children: (childrenResult.data as User[] | null) ?? [],
    transactions: (transactionsResult.data as Transaction[] | null) ?? [],
  };
}

export default function ActivityPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const refresh = useCallback(async () => {
    const nextData = await loadActivity();
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

  const childById = useMemo(() => new Map((data?.children ?? []).map((child) => [child.id, child])), [data?.children]);
  const filteredTransactions = useMemo(() => {
    const transactions = data?.transactions ?? [];
    return filter === "all" ? transactions : transactions.filter((transaction) => transaction.type === filter);
  }, [data?.transactions, filter]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const transaction of filteredTransactions) {
      const key = new Date(transaction.created_at).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      groups.set(key, [...(groups.get(key) ?? []), transaction]);
    }
    return [...groups.entries()];
  }, [filteredTransactions]);

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Family Ledger"
        title="Activity"
        description={`${data.transactions.length} total transaction${data.transactions.length === 1 ? "" : "s"}`}
        action={<Link href="/dashboard" className="button ghost-button">Dashboard</Link>}
      />

      <div className="filter-row">
        {FILTERS.map((item) => (
          <button className={filter === item.key ? "choice-chip active" : "choice-chip"} type="button" key={item.key} onClick={() => setFilter(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {filteredTransactions.length === 0 ? (
        <section className="card empty-card page-empty">
          <div className="empty-icon">↺</div>
          <h2>No activity yet</h2>
          <p className="muted">Transactions appear here after payday, gifts, withdrawals, or interest processing.</p>
        </section>
      ) : (
        <section className="activity-list">
          {groupedTransactions.map(([date, transactions]) => (
            <div className="activity-day" key={date}>
              <p className="eyebrow">{date}</p>
              <div className="card activity-card">
                {transactions.map((transaction) => {
                  const child = childById.get(transaction.child_id);
                  const positive = Number(transaction.amount) >= 0;
                  return (
                    <div className="activity-row" key={transaction.id}>
                      <div className={`activity-icon ${positive ? "positive" : "negative"}`}>
                        {transactionIcon(transaction.type)}
                      </div>
                      <div>
                        <strong>{transaction.description || typeLabel(transaction.type)}</strong>
                        <p className="muted">{child ? `${child.avatar_emoji} ${child.name}` : "Unknown"} · {typeLabel(transaction.type)}</p>
                      </div>
                      <span className={positive ? "activity-amount positive" : "activity-amount negative"}>
                        {positive ? "+" : "-"}${Math.abs(Number(transaction.amount)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}

function transactionIcon(type: TransactionType) {
  if (type === "chore_earning") return "🧹";
  if (type === "gift") return "🎁";
  if (type === "withdrawal") return "↘";
  if (type === "interest") return "%";
  if (type === "parent_match") return "🤝";
  return "$";
}
