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
    connecting: "Waiting for Google sign-in...",
    connected: "Gmail is connected for this browser session.",
  } as const satisfies Record<GmailConnectionStatus, string>;

  return labels[status];
};

export const getSyncSummary = (result: GmailSyncResult): string => {
  const account =
    result.profile === null ? "Gmail" : result.profile.emailAddress;
  return `${account}: fetched ${result.fetchedCount}, analyzed ${result.matchedCount} application emails.`;
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
