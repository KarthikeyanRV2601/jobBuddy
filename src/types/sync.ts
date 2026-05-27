export type GmailSyncCache = {
  readonly lastSyncedAt: string;
  readonly lastQuery: string;
  readonly lastMessageCount: number;
  readonly cachedEmailBufferCount: number;
};
