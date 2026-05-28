import type { EmailSignal } from "./email";

export type GmailConnectionStatus = "disconnected" | "connecting" | "connected";

export type GmailProfile = {
  readonly emailAddress: string;
  readonly messagesTotal: number;
  readonly threadsTotal: number;
};

export type GmailMessageHeaderName =
  | "From"
  | "To"
  | "Subject"
  | "Date"
  | "Message-ID";

export type GmailMessage = {
  readonly id: string;
  readonly threadId: string;
  readonly subject: string;
  readonly from: string;
  readonly date: string;
  readonly internalDate: string;
  readonly snippet: string;
  readonly bodyText: string;
};

export type GmailSyncOptions = {
  readonly accessToken: string;
  readonly query: string;
};

export type GmailSyncResult = {
  readonly profile: GmailProfile | null;
  readonly messages: readonly GmailMessage[];
  readonly signals: readonly EmailSignal[];
  readonly fetchedCount: number;
  readonly matchedCount: number;
  readonly updatedApplicationsCount: number;
  readonly syncedAt: string;
};

export type GmailAccessSession = {
  readonly accessToken: string;
  readonly expiresAt: string;
};

export type GoogleTokenResponse = {
  readonly access_token?: string;
  readonly expires_in?: number;
  readonly error?: string;
  readonly error_description?: string;
};

export type GoogleTokenClient = {
  readonly requestAccessToken: (options?: { readonly prompt?: string }) => void;
};

export type GoogleTokenClientConfig = {
  readonly client_id: string;
  readonly scope: string;
  readonly callback: (response: GoogleTokenResponse) => void;
  readonly error_callback?: (error: unknown) => void;
};

export type GoogleIdentityServices = {
  readonly accounts: {
    readonly oauth2: {
      readonly initTokenClient: (
        config: GoogleTokenClientConfig,
      ) => GoogleTokenClient;
    };
  };
};
