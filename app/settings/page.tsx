"use client";

import { AppShell, LoadingScreen, PageHeader } from "@/components/web/AppShell";
import {
  DEFAULT_CHORE_REWARD,
  formatDefaultChoreReward,
  parseDefaultChoreReward,
  readDefaultChoreReward,
  writeDefaultChoreReward,
} from "@/lib/defaultChoreReward";
import { supabase } from "@/lib/supabase-browser";
import type { Family, User } from "@/types/database";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const profileEmojis = ["😊", "😎", "🤓", "🥳", "🚀", "💪", "🌟", "🧠", "🎯", "💰"];

type SettingsData = {
  authEmail: string | null;
  profile: User;
  family: Family | null;
  googleConnected: boolean;
};

type ConfirmAction = {
  title: string;
  message: string;
  actionLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
};

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function loadSettings(): Promise<SettingsData | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  const [familyResult, googleResult] = await Promise.all([
    profile.family_id
      ? supabase.from("families").select("*").eq("id", profile.family_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("google_tokens").select("id").eq("user_id", profile.id).maybeSingle(),
  ]);

  return {
    authEmail: authUser.email ?? null,
    profile: profile as User,
    family: (familyResult.data as Family | null) ?? null,
    googleConnected: !!googleResult.data,
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmoji, setProfileEmoji] = useState("😊");

  const [familyOpen, setFamilyOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [rewardOpen, setRewardOpen] = useState(false);
  const [defaultReward, setDefaultReward] = useState(DEFAULT_CHORE_REWARD);
  const [rewardDraft, setRewardDraft] = useState(formatDefaultChoreReward(DEFAULT_CHORE_REWARD));
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const familyId = data?.family?.id;
  const canManageFamily = !!familyId;

  const familySubtitle = useMemo(() => {
    if (!data?.family) return "Create a family to enable shared settings.";
    return "Members can join with your family invite code.";
  }, [data?.family]);

  const refresh = useCallback(async () => {
    const nextData = await loadSettings();
    if (!nextData) {
      router.replace("/welcome");
      return;
    }
    setData(nextData);
    setProfileName(nextData.profile.name);
    setProfileEmoji(nextData.profile.avatar_emoji ?? "😊");
    setFamilyName(nextData.family?.name ?? "");
    const familyReward = nextData.family?.default_chore_reward;
    if (familyReward != null) {
      const parsedReward = Number(familyReward);
      if (Number.isFinite(parsedReward)) {
        setDefaultReward(parsedReward);
        setRewardDraft(formatDefaultChoreReward(parsedReward));
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const savedReward = readDefaultChoreReward();
    setDefaultReward(savedReward);
    setRewardDraft(formatDefaultChoreReward(savedReward));
    refresh();
  }, [refresh]);

  function showSuccess(text: string) {
    setError(null);
    setMessage(text);
  }

  function showError(text: string) {
    setMessage(null);
    setError(text);
  }

  async function runAction(action: () => Promise<void>, successText: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      showSuccess(successText);
      await refresh();
    } catch (actionError) {
      showError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const trimmed = profileName.trim();
    if (!trimmed) return showError("Enter your name.");

    await runAction(async () => {
      const { error: updateError } = await supabase
        .from("users")
        .update({ name: trimmed, avatar_emoji: profileEmoji })
        .eq("id", data.profile.id);
      if (updateError) throw updateError;
      setProfileOpen(false);
    }, "Profile updated.");
  }

  async function handleFamilySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.family) return;
    const trimmed = familyName.trim();
    if (!trimmed) return showError("Enter a family name.");

    await runAction(async () => {
      const { error: updateError } = await supabase
        .from("families")
        .update({ name: trimmed })
        .eq("id", data.family!.id);
      if (updateError) throw updateError;
      setFamilyOpen(false);
    }, "Family name updated.");
  }

  async function handleDefaultRewardSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseDefaultChoreReward(rewardDraft);
    if (amount == null) {
      showError("Enter a valid default reward.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (data?.family) {
        const { error: updateError } = await supabase
          .from("families")
          .update({ default_chore_reward: amount })
          .eq("id", data.family.id);
        if (updateError) throw updateError;
      }

      writeDefaultChoreReward(amount);
      setDefaultReward(amount);
      setRewardDraft(formatDefaultChoreReward(amount));
      setRewardOpen(false);
      showSuccess("Default chore reward updated.");
      await refresh();
    } catch (saveError) {
      showError(saveError instanceof Error ? saveError.message : "Could not update default chore reward.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.authEmail) return showError("This account does not have an email password.");
    if (!currentPassword) return showError("Enter your current password.");
    if (newPassword.length < 6) return showError("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return showError("New passwords do not match.");

    await runAction(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.authEmail!,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect.");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, "Password updated.");
  }

  async function regenerateInviteCode() {
    if (!data?.family) throw new Error("No family found.");
    const { error: updateError } = await supabase
      .from("families")
      .update({ invite_code: inviteCode() })
      .eq("id", data.family.id);
    if (updateError) throw updateError;
  }

  async function clearCompletedChores() {
    if (!familyId) throw new Error("No family found.");
    const { error: deleteError } = await supabase
      .from("chores")
      .delete()
      .eq("family_id", familyId)
      .in("status", ["done", "approved"]);
    if (deleteError) throw deleteError;
  }

  async function clearAllChores() {
    if (!familyId) throw new Error("No family found.");
    const { error: deleteError } = await supabase.from("chores").delete().eq("family_id", familyId);
    if (deleteError) throw deleteError;
  }

  async function clearTransactionHistory() {
    if (!familyId) throw new Error("No family found.");
    const { data: children, error: childrenError } = await supabase
      .from("users")
      .select("id")
      .eq("family_id", familyId)
      .eq("role", "child");
    if (childrenError) throw childrenError;

    const childIds = (children ?? []).map((child) => child.id);
    if (childIds.length === 0) return;

    const { data: buckets, error: bucketError } = await supabase
      .from("buckets")
      .select("id")
      .in("child_id", childIds);
    if (bucketError) throw bucketError;

    const bucketIds = (buckets ?? []).map((bucket) => bucket.id);
    if (bucketIds.length === 0) return;

    const { error: transactionError } = await supabase
      .from("transactions")
      .delete()
      .in("bucket_id", bucketIds);
    if (transactionError) throw transactionError;

    const { error: balanceError } = await supabase
      .from("buckets")
      .update({ cached_balance: 0 })
      .in("id", bucketIds);
    if (balanceError) throw balanceError;
  }

  async function resetInterestSettings() {
    if (!familyId) throw new Error("No family found.");
    const { error: deleteError } = await supabase
      .from("interest_settings")
      .delete()
      .eq("family_id", familyId);
    if (deleteError) throw deleteError;
  }

  async function deleteAccount() {
    const { error: rpcError } = await supabase.rpc("delete_user");
    if (rpcError) throw rpcError;
    await supabase.auth.signOut();
    router.replace("/welcome");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/welcome");
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    await runAction(action.run, `${action.title} complete.`);
  }

  if (loading || !data) return <LoadingScreen />;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Family Settings"
        description="Manage profile, family invite code, defaults, account access, and cleanup actions."
      />

      {(message || error) ? (
        <div className={error ? "notice error" : "notice success"} role="status">
          {error ?? message}
        </div>
      ) : null}

      <section className="settings-grid">
        <article className="card settings-card">
          <h2>My Profile</h2>
          <div className="settings-row">
            <span className="avatar">{data.profile.avatar_emoji}</span>
            <div>
              <strong>{data.profile.name}</strong>
              <p className="muted">Parent</p>
            </div>
            <button className="ghost-button" onClick={() => setProfileOpen(true)}>Edit</button>
          </div>
        </article>

        <article className="card settings-card">
          <h2>Appearance</h2>
          <div className="segmented-control" aria-label="Theme mode">
            <button className="active" type="button">Dark</button>
            <button type="button" disabled>Light</button>
            <button type="button" disabled>System</button>
          </div>
          <p className="muted">Theme switching will be added once the core pages are ported.</p>
        </article>

        <article className="card settings-card wide">
          <h2>Family</h2>
          <p className="muted">{familySubtitle}</p>
          {data.family ? (
            <div className="family-settings-row">
              <div>
                <strong>{data.family.name}</strong>
                <p className="muted">Invite Code</p>
              </div>
              <span className="invite-code">{data.family.invite_code}</span>
              <div className="inline-actions">
                <button className="ghost-button" onClick={() => setFamilyOpen(true)}>Rename</button>
                <button
                  className="ghost-button"
                  onClick={() => setConfirmAction({
                    title: "Regenerate Invite Code",
                    message: "The old invite code will stop working immediately.",
                    actionLabel: "Regenerate",
                    destructive: true,
                    run: regenerateInviteCode,
                  })}
                  disabled={busy}
                >
                  New Code
                </button>
              </div>
            </div>
          ) : (
            <button className="button" onClick={() => router.push("/family-setup")}>Create Family</button>
          )}
        </article>

        <article className="card settings-card wide">
          <h2>Data Management</h2>
          <div className="settings-list">
            <ActionRow
              icon="$"
              title="Default Chore Reward"
              description={`$${defaultReward.toFixed(2)} pre-filled when creating chores`}
              actionLabel="Edit"
              disabled={busy}
              onAction={() => {
                setRewardDraft(formatDefaultChoreReward(defaultReward));
                setRewardOpen(true);
              }}
            />
            <ActionRow
              icon="✓"
              title="Clear Completed Chores"
              description="Remove all done and approved chores"
              tone="warn"
              disabled={!canManageFamily || busy}
              actionLabel="Clear"
              onAction={() => setConfirmAction({
                title: "Clear Completed Chores",
                message: "This permanently deletes chores marked done or approved. Assigned chores are not affected.",
                actionLabel: "Clear",
                destructive: true,
                run: clearCompletedChores,
              })}
            />
            <ActionRow
              icon="≡"
              title="Clear All Chores"
              description="Remove every chore for all children"
              tone="danger"
              disabled={!canManageFamily || busy}
              actionLabel="Delete"
              onAction={() => setConfirmAction({
                title: "Clear All Chores",
                message: "This permanently deletes every chore for this family. This cannot be undone.",
                actionLabel: "Delete All",
                destructive: true,
                run: clearAllChores,
              })}
            />
            <ActionRow
              icon="▤"
              title="Clear Transaction History"
              description="Delete all transactions and reset balances to $0"
              tone="danger"
              disabled={!canManageFamily || busy}
              actionLabel="Delete"
              onAction={() => setConfirmAction({
                title: "Clear Transaction History",
                message: "This permanently deletes all transactions and resets every bucket balance to $0.",
                actionLabel: "Delete All",
                destructive: true,
                run: clearTransactionHistory,
              })}
            />
            <ActionRow
              icon="%"
              title="Reset Interest Settings"
              description="Remove all interest and parent match rates"
              tone="warn"
              disabled={!canManageFamily || busy}
              actionLabel="Reset"
              onAction={() => setConfirmAction({
                title: "Reset Interest Settings",
                message: "This deletes all interest and parent match settings for every savings bucket.",
                actionLabel: "Reset",
                destructive: true,
                run: resetInterestSettings,
              })}
            />
          </div>
        </article>

        <article className="card settings-card">
          <h2>Account</h2>
          <div className="settings-list">
            <ActionRow
              icon="⌁"
              title="Change Password"
              description={data.authEmail ?? "Password changes are available for email accounts"}
              actionLabel="Change"
              onAction={() => setPasswordOpen(true)}
            />
            <ActionRow
              icon="↪"
              title="Sign Out"
              description="End this browser session"
              actionLabel="Sign Out"
              onAction={signOut}
            />
            <ActionRow
              icon="×"
              title="Delete Account"
              description="Delete your family, members, and data"
              tone="danger"
              actionLabel="Delete"
              onAction={() => setConfirmAction({
                title: "Delete Account",
                message: "This instantly deletes your family, members, and data. This action cannot be undone.",
                actionLabel: "Delete My Account",
                destructive: true,
                run: deleteAccount,
              })}
            />
          </div>
        </article>

        <article className="card settings-card">
          <h2>Integrations</h2>
          <div className="settings-row">
            <span className="avatar">G</span>
            <div>
              <strong>Google Tasks</strong>
              <p className="muted">{data.googleConnected ? "Connected" : "Not connected"}</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => router.push("/google-tasks")}>Open</button>
          </div>
        </article>
      </section>

      {profileOpen ? (
        <Modal title="Edit Profile" onClose={() => setProfileOpen(false)}>
          <form className="form-grid" onSubmit={handleProfileSave}>
            <div className="form-field">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </div>
            <div className="emoji-grid" aria-label="Avatar">
              {profileEmojis.map((emoji) => (
                <button
                  key={emoji}
                  className={profileEmoji === emoji ? "emoji-choice active" : "emoji-choice"}
                  type="button"
                  onClick={() => setProfileEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setProfileOpen(false)}>Cancel</button>
              <button className="button" type="submit" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {familyOpen ? (
        <Modal title="Rename Family" onClose={() => setFamilyOpen(false)}>
          <form className="form-grid" onSubmit={handleFamilySave}>
            <div className="form-field">
              <label htmlFor="family-name">Family Name</label>
              <input id="family-name" value={familyName} onChange={(event) => setFamilyName(event.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setFamilyOpen(false)}>Cancel</button>
              <button className="button" type="submit" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {rewardOpen ? (
        <Modal title="Default Chore Reward" onClose={() => setRewardOpen(false)}>
          <form className="form-grid" onSubmit={handleDefaultRewardSave}>
            <div className="form-field">
              <label htmlFor="default-reward">Amount</label>
              <input id="default-reward" inputMode="decimal" value={rewardDraft} onChange={(event) => setRewardDraft(event.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setRewardOpen(false)}>Cancel</button>
              <button className="button" type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {passwordOpen ? (
        <Modal title="Change Password" onClose={() => setPasswordOpen(false)}>
          <form className="form-grid" onSubmit={handlePasswordSave}>
            <div className="form-field">
              <label htmlFor="current-password">Current Password</label>
              <input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="new-password">New Password</label>
              <input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setPasswordOpen(false)}>Cancel</button>
              <button className="button" type="submit" disabled={busy}>Update</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmAction ? (
        <Modal title={confirmAction.title} onClose={() => setConfirmAction(null)}>
          <p className="muted" style={{ marginTop: 0 }}>{confirmAction.message}</p>
          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={() => setConfirmAction(null)} disabled={busy}>Cancel</button>
            <button className={confirmAction.destructive ? "danger-button" : "button"} type="button" onClick={handleConfirm} disabled={busy}>
              {busy ? "Working..." : confirmAction.actionLabel}
            </button>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}

function ActionRow({
  icon,
  title,
  description,
  actionLabel,
  tone,
  disabled,
  onAction,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  tone?: "warn" | "danger";
  disabled?: boolean;
  onAction: () => void;
}) {
  return (
    <div className={`settings-row ${tone ?? ""}`}>
      <span className="avatar">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
      </div>
      <button
        className={tone === "danger" ? "danger-button" : "ghost-button"}
        type="button"
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-title-row">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}
