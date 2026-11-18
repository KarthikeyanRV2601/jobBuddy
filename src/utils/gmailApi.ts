import type {
  GmailMessage,
  GmailFetchResult,
  GmailMessageHeaderName,
  GmailProfile,
  GmailSyncOptions,
} from "../types/gmail";

type GmailListResponse = {
  readonly messages?: readonly {
    readonly id: string;
    readonly threadId: string;
  }[];
  readonly nextPageToken?: string;
};

type GmailProfileResponse = {
  readonly emailAddress: string;
  readonly messagesTotal: number;
  readonly threadsTotal: number;
};

type GmailHeader = {
  readonly name: string;
  readonly value: string;
};

type GmailPayloadPart = {
  readonly mimeType?: string;
  readonly body?: {
    readonly data?: string;
  };
  readonly parts?: readonly GmailPayloadPart[];
};

type GmailMessageResponse = {
  readonly id: string;
  readonly threadId: string;
  readonly internalDate?: string;
  readonly snippet?: string;
  readonly payload?: GmailPayloadPart & {
    readonly headers?: readonly GmailHeader[];
  };
};

const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

export const fetchGmailProfile = async (
  accessToken: string,
): Promise<GmailProfile> => {
  const response = await gmailFetch<GmailProfileResponse>(
    `${GMAIL_API_BASE_URL}/profile`,
    accessToken,
  );

  return {
    emailAddress: response.emailAddress,
    messagesTotal: response.messagesTotal,
    threadsTotal: response.threadsTotal,
  };
};

// Fetch and drain one search page before asking Gmail for the next page.
export const fetchGmailMessages = async (
  options: GmailSyncOptions,
): Promise<GmailFetchResult> => {
  const request = createGmailFetch();
  const messages: GmailMessage[] = [];
  const warnings = new Set<string>();
  const knownIds = new Set(options.knownMessageIds ?? []);
  const seenIds = new Set<string>();
  const seenTokens = new Set<string>();
  let failedCount = 0;
  let skippedCount = 0;
  let nextPageToken = "";
  let complete = true;
  let stopped = false;

  do {
    const listUrl = new URL(`${GMAIL_API_BASE_URL}/messages`);
    listUrl.searchParams.set("q", options.query);
    listUrl.searchParams.set("maxResults", "50");
    if (nextPageToken) listUrl.searchParams.set("pageToken", nextPageToken);
    let page: GmailListResponse;
    try {
      page = await request<GmailListResponse>(listUrl.toString(), options.accessToken);
    } catch (error) {
      if (messages.length === 0 && skippedCount === 0) throw error;
      warnings.add(errorMessage(error));
      complete = false;
      break;
    }

    const refs = (page.messages ?? []).filter(({ id }) => {
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      if (knownIds.has(id)) {
        skippedCount += 1;
        return false;
      }
      return true;
    });
    // Batches cap concurrency, preserve search order, and let all in-flight work settle.
    for (let offset = 0; offset < refs.length; offset += 3) {
      const batch = refs.slice(offset, offset + 3);
      const results = await Promise.allSettled(batch.map(({ id }) =>
        fetchGmailMessage(options.accessToken, id, request),
      ));
      for (const result of results) {
        if (result.status === "fulfilled") {
          messages.push(result.value);
        } else {
          failedCount += 1;
          complete = false;
          warnings.add(errorMessage(result.reason));
          if (result.reason instanceof GmailApiError && result.reason.stopScan) {
            stopped = true;
          }
        }
      }
      if (stopped) {
        failedCount += refs.length - offset - batch.length;
        break;
      }
    }
    if (stopped) break;
    nextPageToken = page.nextPageToken ?? "";
    if (nextPageToken && seenTokens.has(nextPageToken)) {
      complete = false;
      warnings.add("Gmail repeated a search page. Retry sync to finish the scan.");
      break;
    }
    seenTokens.add(nextPageToken);
  } while (nextPageToken);

  return { messages, failedCount, skippedCount, complete, warnings: [...warnings] };
};

const fetchGmailMessage = async (
  accessToken: string,
  messageId: string,
  request = gmailFetch,
): Promise<GmailMessage> => {
  const messageUrl = new URL(`${GMAIL_API_BASE_URL}/messages/${messageId}`);
  messageUrl.searchParams.set("format", "full");

  const response = await request<GmailMessageResponse>(
    messageUrl.toString(),
    accessToken,
  );

  return {
    id: response.id,
    threadId: response.threadId,
    subject: getHeaderValue(response.payload?.headers, "Subject"),
    from: getHeaderValue(response.payload?.headers, "From"),
    date: getHeaderValue(response.payload?.headers, "Date"),
    internalDate: response.internalDate ?? "",
    snippet: response.snippet ?? "",
    bodyText: extractMessageText(response.payload),
  };
};

class GmailApiError extends Error {
  constructor(message: string, readonly stopScan: boolean) {
    super(message);
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Gmail request failed.";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Each scan shares its cooldown across all workers; no token is logged or persisted here.
const createGmailFetch = () => {
  let cooldownUntil = 0;
  return async <Response>(url: string, accessToken: string): Promise<Response> => {
    for (let attempt = 0; ; attempt += 1) {
      while (cooldownUntil > Date.now()) await wait(cooldownUntil - Date.now());
      let response: globalThis.Response;
      try {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        if (attempt >= 3) throw error;
        await wait(1000 * 2 ** attempt + Math.random() * 500);
        continue;
      }
      if (response.ok) return (await response.json()) as Response;
      const body = await response.json().catch(() => null) as {
        error?: { errors?: { reason?: string }[] };
      } | null;
      const reasons = body?.error?.errors?.map((item) => item.reason ?? "") ?? [];
      const rateLimited = response.status === 429 ||
        (response.status === 403 && reasons.some((reason) =>
          ["rateLimitExceeded", "userRateLimitExceeded"].includes(reason)));
      const retryable = rateLimited || [500, 502, 503, 504].includes(response.status);
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const retryAt = retryAfter === null ? NaN : Date.parse(retryAfter);
      const retryDelay = Number.isFinite(seconds) ? seconds * 1000 :
        Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : 0;
      const message = `Gmail API request failed with ${response.status}${reasons.length ? ` (${reasons.join(", ")})` : ""}.`;
      // Long server cooldowns are reported rather than ignored or retried early.
      if (!retryable || attempt >= 3 || retryDelay > 60_000) {
        throw new GmailApiError(message, rateLimited || response.status === 401);
      }
      const delay = Math.max(retryDelay, 1000 * 2 ** attempt + Math.random() * 500);
      cooldownUntil = Math.max(cooldownUntil, Date.now() + delay);
    }
  };
};

const gmailFetch = <Response>(url: string, accessToken: string): Promise<Response> =>
  createGmailFetch()<Response>(url, accessToken);

const getHeaderValue = (
  headers: readonly GmailHeader[] | undefined,
  name: GmailMessageHeaderName,
): string =>
  headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())
    ?.value ?? "";

const extractMessageText = (
  payload: GmailPayloadPart | undefined,
): string => {
  if (payload === undefined) {
    return "";
  }

  const directText = decodeBodyData(payload.body?.data);
  if (payload.mimeType === "text/html") {
    return htmlToText(directText);
  }

  if (directText.length > 0 && payload.mimeType !== "text/html") {
    return directText;
  }

  return (
    payload.parts
      ?.map(extractMessageText)
      .filter((part) => part.length > 0)
      .join("\n") ?? ""
  );
};

const decodeBodyData = (data: string | undefined): string => {
  if (data === undefined) {
    return "";
  }

  const base64 = data.replaceAll("-", "+").replaceAll("_", "/");
  try {
    return decodeURIComponent(
      Array.from(atob(base64))
        .map((character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
        )
        .join(""),
    );
  } catch {
    return atob(base64);
  }
};

const htmlToText = (html: string): string => {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  return documentFragment.body.textContent?.trim() ?? "";
};
