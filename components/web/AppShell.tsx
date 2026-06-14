"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/children", label: "Children", icon: "users" },
  { href: "/bucket-templates", label: "Buckets", icon: "wallet" },
  { href: "/family-tasks-dashboard", label: "Chore Board", icon: "board" },
  { href: "/chores", label: "Chores", icon: "check" },
  { href: "/payday", label: "Payday", icon: "cash" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/google-tasks", label: "Google Tasks", icon: "sync" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

type NavIconName = (typeof navItems)[number]["icon"] | "piggy" | "panel" | "logout";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountDetail, setAccountDetail] = useState("");
  const [accountAvatar, setAccountAvatar] = useState("😊");

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("famfi-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAccount(session: Session | null) {
      if (!mounted) return;

      setHasSession(Boolean(session));
      if (!session?.user) {
        setAccountName("");
        setAccountDetail("");
        setAccountAvatar("😊");
        return;
      }

      const fallbackName = session.user.email ?? "Signed in";
      setAccountName(fallbackName);
      setAccountDetail(session.user.email ? "Signed in with email" : "Signed in on this device");

      const { data: profile } = await supabase
        .from("users")
        .select("name, avatar_emoji, role")
        .eq("auth_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (profile?.name) {
        setAccountName(profile.name);
        setAccountAvatar(profile.avatar_emoji ?? "😊");
        setAccountDetail(session.user.email ?? (profile.role === "parent" ? "Parent profile" : "Child profile"));
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      void loadAccount(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAccount(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("famfi-sidebar-collapsed", String(next));
      return next;
    });
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/welcome");
  }

  return (
    <div className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar" aria-label="Primary navigation" data-collapsed={sidebarCollapsed}>
        <div className="sidebar-top">
          <Link href="/dashboard" className="brand" aria-label="FamFi home" title="FamFi Piggy Bank">
            <span className="brand-mark" aria-hidden="true">
              <NavIcon name="piggy" />
            </span>
            <span className="brand-text">FamFi Piggy Bank</span>
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            <NavIcon name="panel" />
          </button>
        </div>
        <nav className="sidebar-nav">
          <span className="nav-section-label">Main</span>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-item active" : "nav-item"}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  <NavIcon name={item.icon} />
                </span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {hasSession ? (
          <div className="sidebar-account">
            <div className="sidebar-account-meta">
              <span className="account-avatar" aria-hidden="true">{accountAvatar}</span>
              <span className="account-copy">
                <strong>{accountName}</strong>
                <small>{accountDetail}</small>
              </span>
            </div>
            <button
              type="button"
              className="sidebar-signout"
              onClick={signOut}
              disabled={signingOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <span className="nav-icon" aria-hidden="true">
                <NavIcon name="logout" />
              </span>
              <span className="nav-label">{signingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        ) : null}
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm8-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 2c-.6 0-1.2.1-1.8.2 1.1.8 1.8 1.8 1.8 2.8v2h4v-2c0-1.8-1.8-3-4-3Z" />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v2H7a1 1 0 0 0 0 2h14v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-11Zm13 7.5a1.5 1.5 0 1 0 0 3h2v-3h-2Z" />
        </svg>
      );
    case "board":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 4v3h5V8H6Zm7 0v3h5V8h-5ZM6 13v3h5v-3H6Zm7 0v3h5v-3h-5Z" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm4.8 11.7 6-6-1.6-1.4-4.4 4.4-2-2L7.2 12l3.6 3.7Z" />
        </svg>
      );
    case "cash":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M4 7h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm2 2.5A2.5 2.5 0 0 1 3.5 12v1A2.5 2.5 0 0 1 6 15.5h12a2.5 2.5 0 0 1 2.5-2.5v-1A2.5 2.5 0 0 1 18 9.5H6Zm6 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-2.1-5H14v2h6V3h-2v2a9 9 0 0 0-6-2Zm-1 4h2v5.2l3.5 2.1-1 1.7-4.5-2.7V7Z" />
        </svg>
      );
    case "sync":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M7 7.8A7 7 0 0 1 18.1 9H15v2h6V5h-2v2A9 9 0 0 0 5.2 6.4L7 7.8Zm10 8.4A7 7 0 0 1 5.9 15H9v-2H3v6h2v-2a9 9 0 0 0 13.8.6L17 16.2Z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8 8 0 0 0 7 6L4.6 5 2.6 8.5l2 1.5-.1 1.5.1 1.5-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.5A8 8 0 0 0 17 18l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
        </svg>
      );
    case "panel":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm5 2H4v10h5V7Zm2 0v10h9V7h-9Z" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M5 4h8a2 2 0 0 1 2 2v3h-2V6H5v12h8v-3h2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm11.6 4.4L21.2 13l-4.6 4.6-1.4-1.4 2.2-2.2H9v-2h8.4l-2.2-2.2 1.4-1.4Z" />
        </svg>
      );
    case "piggy":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M6.2 10.2A5.8 5.8 0 0 1 11.8 6h3.7c2.9 0 5.3 2 5.9 4.6H23v4h-1.8a6 6 0 0 1-2.2 2.8V21h-3v-2h-6v2H7v-3.1a6.2 6.2 0 0 1-2.8-3.7H2v-4h4.2ZM9 8.2a4 4 0 0 0-1.2 2h6.7a2.5 2.5 0 0 0-2.4-2H9Zm8.5 4.3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        </svg>
      );
    default:
      return null;
  }
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

export function LoadingScreen() {
  return (
    <div className="center-screen">
      <div className="spinner" aria-label="Loading" />
    </div>
  );
}
