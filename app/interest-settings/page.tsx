"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import { supabase } from "@/lib/supabase-browser";
import type { BucketTemplate, InterestSetting, User } from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type InterestData = {
  profile: User;
  templates: BucketTemplate[];
  settings: InterestSetting[];
};

type LocalSetting = {
  rate: string;
  match: boolean;
};

async function loadInterestData(): Promise<InterestData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
  if (!profile?.family_id) return null;

  const [templatesResult, settingsResult] = await Promise.all([
    supabase.from("bucket_templates").select("*").eq("family_id", profile.family_id).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("interest_settings").select("*").eq("family_id", profile.family_id),
  ]);

  return {
    profile: profile as User,
    templates: (templatesResult.data as BucketTemplate[] | null) ?? [],
    settings: (settingsResult.data as InterestSetting[] | null) ?? [],
  };
}

export default function InterestSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<InterestData | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, LocalSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadInterestData();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    const nextSettings: Record<string, LocalSetting> = {};
    for (const template of nextData.templates) {
      const existing = nextData.settings.find((setting) => setting.template_id === template.id);
      nextSettings[template.id] = {
        rate: existing ? String(existing.rate_percent) : "0",
        match: existing ? existing.match_enabled : false,
      };
    }
    setLocalSettings(nextSettings);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    for (const [templateId, setting] of Object.entries(localSettings)) {
      const rate = Number(setting.rate);
      if (!Number.isFinite(rate) || rate < 0) {
        setSaving(false);
        setError("Interest rates must be zero or greater.");
        return;
      }

      const { error: saveError } = await supabase
        .from("interest_settings")
        .upsert(
          {
            family_id: data.profile.family_id,
            template_id: templateId,
            rate_percent: rate,
            match_enabled: setting.match,
          },
          { onConflict: "family_id,template_id" },
        );

      if (saveError) {
        setSaving(false);
        setError(saveError.message);
        return;
      }
    }

    setSaving(false);
    setNotice("Interest settings saved.");
    await refresh();
  }

  async function processInterest() {
    if (!data) return;
    setProcessing(true);
    setError(null);
    setNotice(null);

    const { data: processed, error: processError } = await supabase.rpc("process_monthly_interest", {
      p_family_id: data.profile.family_id,
    });

    setProcessing(false);

    if (processError) {
      setError(processError.message);
      return;
    }

    const count = Number(processed ?? 0);
    setNotice(count === 0 ? "No qualifying balances to process interest on." : `Interest processed for ${count} bucket${count === 1 ? "" : "s"}.`);
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Growth"
        title="Interest & Match"
        description="Set monthly interest rates and optional parent matching for each bucket."
        action={<Link href="/activity" className="button ghost-button">Activity</Link>}
      />

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      {data.templates.length === 0 ? (
        <section className="card empty-card page-empty">
          <div className="empty-icon">%</div>
          <h2>No buckets yet</h2>
          <p className="muted">Create bucket templates before configuring interest.</p>
          <Link href="/bucket-templates" className="button">Set Up Buckets</Link>
        </section>
      ) : (
        <form className="interest-grid" onSubmit={saveSettings}>
          {data.templates.map((template) => {
            const setting = localSettings[template.id] ?? { rate: "0", match: false };
            return (
              <article className="card interest-card" key={template.id}>
                <div className="bucket-template-icon" style={{ backgroundColor: `${template.color}22`, color: template.color }}>{template.emoji}</div>
                <div className="interest-card-main">
                  <h2>{template.name}</h2>
                  <div className="interest-controls">
                    <div className="form-field">
                      <label htmlFor={`rate-${template.id}`}>Monthly Rate (%)</label>
                      <input
                        id={`rate-${template.id}`}
                        inputMode="decimal"
                        value={setting.rate}
                        onChange={(event) => setLocalSettings((current) => ({
                          ...current,
                          [template.id]: { ...setting, rate: event.target.value },
                        }))}
                      />
                    </div>
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={setting.match}
                        onChange={(event) => setLocalSettings((current) => ({
                          ...current,
                          [template.id]: { ...setting, match: event.target.checked },
                        }))}
                      />
                      <span>
                        <strong>Parent Match</strong>
                        <small>Double the interest bonus</small>
                      </span>
                    </label>
                  </div>
                </div>
              </article>
            );
          })}

          <div className="page-footer-actions wide-actions">
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
            <button className="button ghost-button" type="button" onClick={processInterest} disabled={processing || saving}>
              {processing ? "Processing..." : "Process Interest Now"}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
