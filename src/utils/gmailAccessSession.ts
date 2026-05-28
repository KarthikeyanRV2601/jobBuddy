import type { GmailAccessSession, GoogleTokenResponse } from "../types/gmail";

const GMAIL_ACCESS_SESSION_STORAGE_KEY = "jobbuddy.gmailAccessSession.v1";
const DEFAULT_ACCESS_TOKEN_SECONDS = 3600;
const EXPIRY_BUFFER_SECONDS = 60;
const GMAIL_CONNECTION_SESSION_DAYS = 7;
const GMAIL_CONNECTION_SESSION_MS =
  GMAIL_CONNECTION_SESSION_DAYS * 24 * 60 * 60 * 1000;

type StoredGmailAccessSession = {
  readonly accessToken: unknown;
  readonly connectedAt: unknown;
  readonly expiresAt: unknown;
  readonly sessionExpiresAt: unknown;
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
    connectedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionExpiresAt: new Date(
      issuedAt.getTime() + GMAIL_CONNECTION_SESSION_MS,
    ).toISOString(),
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
    const session = normalizeStoredGmailAccessSession(parsedValue);
    if (session === null) {
      removeCachedGmailAccessSession(storage);
      return null;
    }

    if (isGmailConnectionSessionExpired(session, now)) {
      removeCachedGmailAccessSession(storage);
      return null;
    }

    if (isGmailAccessSessionExpired(session, now)) {
      return null;
    }

    return session;
  } catch {
    removeCachedGmailAccessSession(storage);
    return null;
  }
};

export const readCachedGmailConnectionSession = (
  storage: Storage = window.localStorage,
  now = new Date(),
): GmailAccessSession | null => {
  const rawValue = storage.getItem(GMAIL_ACCESS_SESSION_STORAGE_KEY);
  if (rawValue === null) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredGmailAccessSession;
    const session = normalizeStoredGmailAccessSession(parsedValue);
    if (session === null) {
      removeCachedGmailAccessSession(storage);
      return null;
    }

    if (isGmailConnectionSessionExpired(session, now)) {
      removeCachedGmailAccessSession(storage);
      return null;
    }

    return session;
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

export const isGmailConnectionSessionExpired = (
  session: GmailAccessSession,
  now = new Date(),
): boolean => new Date(session.sessionExpiresAt).getTime() <= now.getTime();

const normalizeStoredGmailAccessSession = (
  value: StoredGmailAccessSession,
): GmailAccessSession | null => {
  if (
    typeof value.accessToken !== "string" ||
    value.accessToken.length === 0 ||
    typeof value.expiresAt !== "string" ||
    !Number.isFinite(new Date(value.expiresAt).getTime())
  ) {
    return null;
  }

  const connectedAt =
    typeof value.connectedAt === "string" &&
    Number.isFinite(new Date(value.connectedAt).getTime())
      ? value.connectedAt
      : new Date().toISOString();
  const sessionExpiresAt =
    typeof value.sessionExpiresAt === "string" &&
    Number.isFinite(new Date(value.sessionExpiresAt).getTime())
      ? value.sessionExpiresAt
      : new Date(
          new Date(connectedAt).getTime() + GMAIL_CONNECTION_SESSION_MS,
        ).toISOString();

  return {
    accessToken: value.accessToken,
    connectedAt,
    expiresAt: value.expiresAt,
    sessionExpiresAt,
  };
};
