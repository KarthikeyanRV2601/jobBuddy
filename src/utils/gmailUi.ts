import type { GmailConnectionStatus, GmailSyncResult } from "../types/gmail";

export const getConnectionLabel = (
  canConnect: boolean,
  status: GmailConnectionStatus,
): string => {
  if (!canConnect) {
    return "Add VITE_GOOGLE_CLIENT_ID to your local .env file to enable Gmail sync.";
  }

  const labels = {
    disconnected: "Connect your Google account with read-only Gmail access.",
    connecting: "Recovering Gmail access...",
    connected: "Gmail is remembered on this device for up to 7 days.",
  } as const satisfies Record<GmailConnectionStatus, string>;

  return labels[status];
};

export const getSyncSummary = (result: GmailSyncResult): string => {
  const account =
    result.profile === null ? "Gmail" : result.profile.emailAddress;
  const summary = `${account}: fetched ${result.fetchedCount} messages, saved ${result.matchedCount} application emails; ${result.skippedCount} already cached.`;
  if (result.complete) return `Sync complete. ${summary}`;
  return `Partial sync. ${summary} ${result.failedCount} messages failed or were deferred. Successful results are saved. Sync again to retry; the previous checkpoint is unchanged. ${result.warnings.join(" ")}`;
};

export const getQueryPreview = (query: string): string => {
  const normalizedQuery = query.replace(/\s+/g, " ").trim();
  if (normalizedQuery.length === 0) {
    return "No search query configured";
  }

  if (normalizedQuery.length <= 92) {
    return normalizedQuery;
  }

  return `${normalizedQuery.slice(0, 89)}...`;
};
