import type { GmailSyncCache } from "../types/sync";

export const createGmailSyncCache = (
  syncedAt: string,
  query: string,
  messageCount: number,
  cachedEmailBufferCount: number,
): GmailSyncCache => ({
  lastSyncedAt: syncedAt,
  lastQuery: query,
  lastMessageCount: messageCount,
  cachedEmailBufferCount,
});

export const buildIncrementalGmailQuery = (
  baseQuery: string,
  cache: GmailSyncCache,
  selectedStartDate: string,
): string => {
  if (selectedStartDate.length > 0) {
    return `${baseQuery} after:${toGmailDateQueryValue(selectedStartDate)}`;
  }

  if (cache.lastSyncedAt.length === 0) {
    return baseQuery;
  }

  return `${baseQuery} after:${toGmailAfterDate(cache.lastSyncedAt)}`;
};

export const getSyncCacheSummary = (cache: GmailSyncCache): string => {
  if (cache.lastSyncedAt.length === 0) {
    return "No Gmail sync cache yet.";
  }

  return `Last sync: ${new Date(cache.lastSyncedAt).toLocaleString()} · ${cache.lastMessageCount} new messages · ${cache.cachedEmailBufferCount} compact email records cached`;
};

const toGmailAfterDate = (isoValue: string): string => {
  const date = new Date(isoValue);
  return toGmailDateParts(date);
};

const toGmailDateQueryValue = (dateValue: string): string => {
  const [year, month, day] = dateValue.split("-");
  if (year === undefined || month === undefined || day === undefined) {
    return dateValue;
  }

  return `${year}/${month}/${day}`;
};

const toGmailDateParts = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("/");
