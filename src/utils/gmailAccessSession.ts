import type { GmailAccessSession, GoogleTokenResponse } from "../types/gmail";

const GMAIL_ACCESS_SESSION_STORAGE_KEY = "jobbuddy.gmailAccessSession.v1";
const DEFAULT_ACCESS_TOKEN_SECONDS = 3600;
const EXPIRY_BUFFER_SECONDS = 60;

type StoredGmailAccessSession = {
  readonly accessToken: unknown;
  readonly expiresAt: unknown;
};

export const createGmailAccessSession = (
  response: GoogleTokenResponse,
  issuedAt = new Date(),
): GmailAccessSession => {
  const rawExpiresIn = response.expires_in ?? DEFAULT_ACCESS_TOKEN_SECONDS;
  const expiresInSeconds = Math.max(0, rawExpiresIn - EXPIRY_BUFFER_SECONDS);
  const expiresAt = new Date(issuedAt.getTime() + expiresInSeconds * 1000);

  return {
    accessToken: response.access_token ?? "",
    expiresAt: expiresAt.toISOString(),
  };
};

export const readCachedGmailAccessSession = (
  storage: Storage = window.localStorage,
  now = new Date(),
): GmailAccessSession | null => {
  const rawValue = storage.getItem(GMAIL_ACCESS_SESSION_STORAGE_KEY);
  if (rawValue === null) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredGmailAccessSession;
    if (!isGmailAccessSession(parsedValue)) {
      removeCachedGmailAccessSession(storage);
      return null;
    }

    if (isGmailAccessSessionExpired(parsedValue, now)) {
      removeCachedGmailAccessSession(storage);
      return null;
    }

    return parsedValue;
  } catch {
    removeCachedGmailAccessSession(storage);
    return null;
  }
};

export const writeCachedGmailAccessSession = (
  session: GmailAccessSession,
  storage: Storage = window.localStorage,
): void => {
  storage.setItem(GMAIL_ACCESS_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const removeCachedGmailAccessSession = (
  storage: Storage = window.localStorage,
): void => {
  storage.removeItem(GMAIL_ACCESS_SESSION_STORAGE_KEY);
};

export const isGmailAccessSessionExpired = (
  session: GmailAccessSession,
  now = new Date(),
): boolean => new Date(session.expiresAt).getTime() <= now.getTime();

const isGmailAccessSession = (
  value: StoredGmailAccessSession,
): value is GmailAccessSession =>
  typeof value.accessToken === "string" &&
  value.accessToken.length > 0 &&
  typeof value.expiresAt === "string" &&
  Number.isFinite(new Date(value.expiresAt).getTime());
