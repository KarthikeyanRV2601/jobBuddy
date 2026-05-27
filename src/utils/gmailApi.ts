import type {
  GmailMessage,
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

export const fetchGmailMessages = async (
  options: GmailSyncOptions,
): Promise<readonly GmailMessage[]> => {
  const messageRefs = await fetchGmailMessageRefs(options);
  const messages = await Promise.all(
    messageRefs.map((message) =>
      fetchGmailMessage(options.accessToken, message.id),
    ),
  );

  return messages;
};

const fetchGmailMessageRefs = async (
  options: GmailSyncOptions,
): Promise<readonly { readonly id: string; readonly threadId: string }[]> => {
  const messageRefs: { readonly id: string; readonly threadId: string }[] = [];
  let nextPageToken = "";

  do {
    const listUrl = new URL(`${GMAIL_API_BASE_URL}/messages`);
    listUrl.searchParams.set("q", options.query);
    listUrl.searchParams.set("maxResults", "500");
    if (nextPageToken.length > 0) {
      listUrl.searchParams.set("pageToken", nextPageToken);
    }

    const listResponse = await gmailFetch<GmailListResponse>(
      listUrl.toString(),
      options.accessToken,
    );

    messageRefs.push(...(listResponse.messages ?? []));
    nextPageToken = listResponse.nextPageToken ?? "";
  } while (nextPageToken.length > 0);

  return messageRefs;
};

const fetchGmailMessage = async (
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> => {
  const messageUrl = new URL(`${GMAIL_API_BASE_URL}/messages/${messageId}`);
  messageUrl.searchParams.set("format", "full");

  const response = await gmailFetch<GmailMessageResponse>(
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

const gmailFetch = async <Response>(
  url: string,
  accessToken: string,
): Promise<Response> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gmail API request failed with ${response.status}.`);
  }

  return (await response.json()) as Response;
};

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
