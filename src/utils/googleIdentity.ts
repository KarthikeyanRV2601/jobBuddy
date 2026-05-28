import type {
  GmailAccessSession,
  GoogleTokenClient,
  GoogleTokenResponse,
} from "../types/gmail";
import { createGmailAccessSession } from "./gmailAccessSession";
import { GMAIL_READONLY_SCOPE } from "./gmailConfig";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

export const requestGmailAccessToken = async (
  clientId: string,
): Promise<GmailAccessSession> => {
  await loadGoogleIdentityScript();

  return new Promise<GmailAccessSession>((resolve, reject) => {
    const google = window.google;
    if (google === undefined) {
      reject(new Error("Google Identity Services failed to load."));
      return;
    }

    const tokenClient: GoogleTokenClient =
      google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GMAIL_READONLY_SCOPE,
        callback: (response: GoogleTokenResponse) => {
          if (response.error !== undefined) {
            reject(
              new Error(response.error_description ?? response.error),
            );
            return;
          }

          if (response.access_token === undefined) {
            reject(new Error("Google did not return an access token."));
            return;
          }

          resolve(createGmailAccessSession(response));
        },
        error_callback: (error: unknown) => {
          reject(
            error instanceof Error
              ? error
              : new Error("Google sign-in was cancelled or failed."),
          );
        },
      });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
};

const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google !== undefined) {
    return;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`,
  );

  if (existingScript !== null) {
    await waitForGoogleIdentityScript(existingScript);
    return;
  }

  const script = document.createElement("script");
  script.src = GOOGLE_IDENTITY_SCRIPT_URL;
  script.async = true;
  script.defer = true;
  document.head.append(script);
  await waitForGoogleIdentityScript(script);
};

const waitForGoogleIdentityScript = (
  script: HTMLScriptElement,
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.google !== undefined) {
      resolve();
      return;
    }

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load Google Identity Services.")),
      { once: true },
    );
  });
