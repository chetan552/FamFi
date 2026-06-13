"use client";

import { LoadingScreen } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      router.replace(data.session ? "/dashboard" : "/welcome");
    });

    return () => {
      active = false;
    };
  }, [router]);

  return <LoadingScreen />;
}
