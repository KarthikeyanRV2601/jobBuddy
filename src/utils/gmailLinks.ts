import type { Application } from "../types/application";
import type { EmailSignal } from "../types/email";

type GmailLinkedEntity = Pick<
  Application | EmailSignal,
  "sourceMessageId" | "sourceThreadId"
>;

export const getGmailUrl = (entity: GmailLinkedEntity): string => {
  const messageId = entity.sourceThreadId || entity.sourceMessageId;
  if (messageId.length === 0) {
    return "";
  }

  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(messageId)}`;
};

export const hasGmailUrl = (entity: GmailLinkedEntity): boolean =>
  getGmailUrl(entity).length > 0;
