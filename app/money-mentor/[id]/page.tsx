"use client";

import { LoadingScreen } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { Bucket, Chore, User } from "@/types/database";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type MentorData = {
  child: User;
  buckets: Bucket[];
  chores: Chore[];
};

type Message = {
  role: "mentor" | "child";
  content: string;
};

async function loadMentorData(childId: string): Promise<MentorData | null> {
  const { data: child } = await supabase.from("users").select("*").eq("id", childId).eq("role", "child").maybeSingle();
  if (!child) return null;

  const [bucketsResult, choresResult] = await Promise.all([
    supabase.from("buckets").select("*").eq("child_id", childId),
    supabase.from("chores").select("*").eq("assigned_to_child_id", childId).order("created_at", { ascending: false }),
  ]);

  return {
    child: child as User,
    buckets: (bucketsResult.data as Bucket[] | null) ?? [],
    chores: (choresResult.data as Chore[] | null) ?? [],
  };
}

export default function MoneyMentorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const [data, setData] = useState<MentorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async () => {
    const nextData = await loadMentorData(childId);
    if (!nextData) {
      router.replace("/child-login");
      return;
    }
    setData(nextData);
    setMessages([
      {
        role: "mentor",
        content: `Hi ${nextData.child.name}! I can help you think about saving, spending, and earning more from chores.`,
      },
    ]);
    setLoading(false);
  }, [childId, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalBalance = useMemo(() => {
    return (data?.buckets ?? []).reduce((sum, bucket) => sum + Number(bucket.cached_balance || 0), 0);
  }, [data?.buckets]);

  const activeChores = useMemo(() => {
    return (data?.chores ?? []).filter((chore) => chore.status === "assigned");
  }, [data?.chores]);

  function mentorReply(question: string) {
    const lower = question.toLowerCase();
    const highestChore = [...activeChores].sort((a, b) => Number(b.value) - Number(a.value))[0];
    const goalMatch = lower.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
    const goal = goalMatch ? Number(goalMatch[1]) : null;

    if (goal && Number.isFinite(goal)) {
      const gap = Math.max(goal - totalBalance, 0);
      if (gap === 0) return `You already have enough for $${goal.toFixed(2)}. Nice work. Ask a parent before spending so your piggy bank stays organized.`;
      if (highestChore) {
        const choresNeeded = Math.ceil(gap / Number(highestChore.value));
        return `You need $${gap.toFixed(2)} more for that goal. Your best chore is "${highestChore.title}" for $${Number(highestChore.value).toFixed(2)}, so about ${choresNeeded} chore${choresNeeded === 1 ? "" : "s"} would get you there.`;
      }
      return `You need $${gap.toFixed(2)} more for that goal. Ask a parent for a chore you can do to earn toward it.`;
    }

    if (lower.includes("chore") || lower.includes("earn")) {
      if (activeChores.length === 0) return "You do not have active chores right now. Ask a parent for one good earning job.";
      return `You have ${activeChores.length} active chore${activeChores.length === 1 ? "" : "s"}. The highest reward is "${highestChore?.title}" for $${Number(highestChore?.value ?? 0).toFixed(2)}.`;
    }

    if (lower.includes("how much") || lower.includes("balance") || lower.includes("money")) {
      return `You have $${totalBalance.toFixed(2)} saved in your piggy bank. A good rule is to save some, give some, and keep some for fun.`;
    }

    if (lower.includes("spend") || lower.includes("buy")) {
      return "Before spending, ask: do I still want this tomorrow, and will I have money left for my bigger goal?";
    }

    return `Your piggy bank has $${totalBalance.toFixed(2)} right now. Pick one goal, do one chore, and watch the number grow.`;
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    setMessages((current) => [
      ...current,
      { role: "child", content: question },
      { role: "mentor", content: mentorReply(question) },
    ]);
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <main className="child-app">
      <header className="child-topbar">
        <Link href={`/child-dashboard/${data.child.id}`} className="brand">
          <span className="brand-mark">🤖</span>
          <span>Money Mentor</span>
        </Link>
        <Link href={`/child-dashboard/${data.child.id}`} className="ghost-button auth-link-button">Back to Piggy Bank</Link>
      </header>

      <section className="mentor-shell">
        <div className="mentor-thread">
          {messages.map((message, index) => (
            <div className={message.role === "child" ? "mentor-message child" : "mentor-message"} key={`${message.role}-${index}`}>
              <div className="mentor-avatar">{message.role === "child" ? data.child.avatar_emoji : "🤖"}</div>
              <p>{message.content}</p>
            </div>
          ))}
        </div>

        {messages.length === 1 ? (
          <div className="mentor-suggestions">
            {[
              "How much money do I have?",
              "What chore should I do first?",
              "How can I save for $50?",
            ].map((suggestion) => (
              <button className="choice-chip" type="button" key={suggestion} onClick={() => setInput(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form className="mentor-input" onSubmit={sendMessage}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a money question..." />
          <button className="button" type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
