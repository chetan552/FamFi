export const DEFAULT_CHORE_REWARD = 5;
export const DEFAULT_CHORE_REWARD_KEY = "famfi-default-chore-amount";

export function parseDefaultChoreReward(value: string | null | undefined) {
  if (value == null) return null;

  const normalized = value.trim().replace(/^\$/, "").replaceAll(",", "");
  if (!normalized) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return amount;
}

export function formatDefaultChoreReward(amount: number) {
  return amount.toFixed(2);
}

export function readDefaultChoreReward() {
  if (typeof window === "undefined") return DEFAULT_CHORE_REWARD;

  return (
    parseDefaultChoreReward(window.localStorage.getItem(DEFAULT_CHORE_REWARD_KEY)) ??
    DEFAULT_CHORE_REWARD
  );
}

export function writeDefaultChoreReward(amount: number) {
  window.localStorage.setItem(DEFAULT_CHORE_REWARD_KEY, formatDefaultChoreReward(amount));
}
