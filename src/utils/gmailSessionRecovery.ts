import type { GmailAccessSession } from "../types/gmail";
import {
  isGmailAccessSessionExpired,
  readCachedGmailAccessSession,
  readCachedGmailConnectionSession,
  writeCachedGmailAccessSession,
} from "./gmailAccessSession";
import { getGoogleClientId, hasGoogleClientId } from "./gmailConfig";
import { requestGmailAccessToken } from "./googleIdentity";

export const recoverGmailAccessSession =
  async (): Promise<GmailAccessSession | null> => {
    if (!hasGoogleClientId()) {
      return null;
    }

    const activeSession = readCachedGmailAccessSession();
    if (activeSession !== null) {
      return activeSession;
    }

    const rememberedSession = readCachedGmailConnectionSession();
    if (
      rememberedSession === null ||
      !isGmailAccessSessionExpired(rememberedSession)
    ) {
      return rememberedSession;
    }

    const renewedSession = await requestGmailAccessToken(
      getGoogleClientId(),
      "",
    );
    writeCachedGmailAccessSession(renewedSession);
    return renewedSession;
  };
