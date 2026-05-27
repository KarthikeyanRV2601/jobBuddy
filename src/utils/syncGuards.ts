import type { GmailSyncCache } from "../types/sync";

export const EMPTY_GMAIL_SYNC_CACHE: GmailSyncCache = {
  lastSyncedAt: "",
  lastQuery: "",
  lastMessageCount: 0,
  cachedEmailBufferCount: 0,
};

export const isGmailSyncCache = (value: unknown): value is GmailSyncCache => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.lastSyncedAt === "string" &&
    typeof candidate.lastQuery === "string" &&
    typeof candidate.lastMessageCount === "number"
  );
};

export const normalizeGmailSyncCache = (
  value: GmailSyncCache,
): GmailSyncCache => ({
  lastSyncedAt: value.lastSyncedAt,
  lastQuery: value.lastQuery,
  lastMessageCount: value.lastMessageCount,
  cachedEmailBufferCount: value.cachedEmailBufferCount ?? 0,
});
