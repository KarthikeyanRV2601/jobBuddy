import type { EmailSignal } from "../types/email";

export const AUTO_UPDATE_CONFIDENCE_THRESHOLD = 72;

export type AttentionPriority = "high" | "medium" | "low";

export type AttentionCategory =
  | "Reply needed"
  | "Assessment"
  | "Interview"
  | "Offer"
  | "Decision"
  | "Review"
  | "Follow-up";

export type AttentionItem = {
  readonly id: string;
  readonly signal: EmailSignal;
  readonly category: AttentionCategory;
  readonly priority: AttentionPriority;
  readonly title: string;
  readonly detail: string;
  readonly actionLabel: string;
  readonly reason: string;
  readonly ageLabel: string;
};

export type AttentionSummary = {
  readonly highPriorityCount: number;
};

export const shouldAutoUpdateFromSignal = (signal: EmailSignal): boolean =>
  signal.status !== "Needs review" &&
  signal.needsReview !== true &&
  signal.confidence >= AUTO_UPDATE_CONFIDENCE_THRESHOLD;

export const getReviewQueueSignals = (
  signals: readonly EmailSignal[],
): readonly EmailSignal[] =>
  signals
    .filter((signal) => !shouldAutoUpdateFromSignal(signal))
    .slice(0, 8);

export const getRecentHighConfidenceSignals = (
  signals: readonly EmailSignal[],
): readonly EmailSignal[] =>
  signals
    .filter(shouldAutoUpdateFromSignal)
    .slice(0, 8);

export const getAttentionItems = (
  signals: readonly EmailSignal[],
  limit = 24,
): readonly AttentionItem[] =>
  signals
    .map(toAttentionItem)
    .filter((item): item is AttentionItem => item !== null)
    .sort(compareAttentionItems)
    .slice(0, limit);

export const getAttentionSummary = (
  items: readonly AttentionItem[],
): AttentionSummary => ({
  highPriorityCount: items.filter((item) => item.priority === "high").length,
});

const toAttentionItem = (signal: EmailSignal): AttentionItem | null => {
  const text = getSignalText(signal);
  const hasReplyRequest = replyRequestPatterns.some((pattern) => pattern.test(text));
  const hasDeadline = deadlinePatterns.some((pattern) => pattern.test(text));
  const hasScheduling = schedulingPatterns.some((pattern) => pattern.test(text));
  const isLowConfidence = !shouldAutoUpdateFromSignal(signal);

  if (
    signal.status === "Follow-up" &&
    !hasReplyRequest &&
    !hasDeadline &&
    !hasScheduling &&
    !isLowConfidence
  ) {
    return null;
  }

  const category = getAttentionCategory(
    signal,
    hasReplyRequest,
    hasDeadline,
    hasScheduling,
  );
  const priority = getAttentionPriority(
    signal,
    category,
    hasDeadline,
    hasReplyRequest,
    isLowConfidence,
  );

  return {
    id: signal.id,
    signal,
    category,
    priority,
    title: signal.subject || "Untitled email",
    detail: signal.insight ?? signal.recommendation,
    actionLabel: getActionLabel(signal, category, hasDeadline, hasReplyRequest),
    reason: getReason(signal, category, hasDeadline, hasReplyRequest, hasScheduling),
    ageLabel: getAgeLabel(signal.receivedAt ?? signal.createdAt),
  };
};

const compareAttentionItems = (
  left: AttentionItem,
  right: AttentionItem,
): number => {
  const timeDelta =
    getSignalTimeValue(right.signal) - getSignalTimeValue(left.signal);
  if (timeDelta !== 0) {
    return timeDelta;
  }

  const priorityDelta =
    priorityRank[right.priority] - priorityRank[left.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return 0;
};

const getAttentionCategory = (
  signal: EmailSignal,
  hasReplyRequest: boolean,
  hasDeadline: boolean,
  hasScheduling: boolean,
): AttentionCategory => {
  if (signal.status === "Needs review") {
    return "Review";
  }

  if (signal.status === "Offer") {
    return "Offer";
  }

  if (signal.status === "Interview" || hasScheduling) {
    return "Interview";
  }

  if (signal.status === "Assessment" || hasDeadline) {
    return "Assessment";
  }

  if (signal.status === "Rejected") {
    return "Decision";
  }

  if (hasReplyRequest) {
    return "Reply needed";
  }

  return "Follow-up";
};

const getAttentionPriority = (
  signal: EmailSignal,
  category: AttentionCategory,
  hasDeadline: boolean,
  hasReplyRequest: boolean,
  isLowConfidence: boolean,
): AttentionPriority => {
  if (
    category === "Offer" ||
    category === "Interview" ||
    hasDeadline ||
    hasReplyRequest
  ) {
    return "high";
  }

  if (category === "Assessment" || category === "Review" || isLowConfidence) {
    return "medium";
  }

  if (signal.status === "Rejected") {
    return "medium";
  }

  return "low";
};

const getActionLabel = (
  signal: EmailSignal,
  category: AttentionCategory,
  hasDeadline: boolean,
  hasReplyRequest: boolean,
): string => {
  if (hasReplyRequest) {
    return "Reply";
  }

  if (hasDeadline || category === "Assessment") {
    return "Track deadline";
  }

  const labels = {
    "Reply needed": "Reply",
    Assessment: "Track deadline",
    Interview: "Prepare",
    Offer: "Review offer",
    Decision: "Log outcome",
    Review: "Confirm",
    "Follow-up": "Watch",
  } as const satisfies Record<AttentionCategory, string>;

  return labels[category] ?? signal.recommendation;
};

const getReason = (
  signal: EmailSignal,
  category: AttentionCategory,
  hasDeadline: boolean,
  hasReplyRequest: boolean,
  hasScheduling: boolean,
): string => {
  if (hasReplyRequest) {
    return "Email appears to ask for a response, confirmation, or availability.";
  }

  if (hasDeadline) {
    return "Deadline or expiry language was detected.";
  }

  if (hasScheduling) {
    return "Scheduling language was detected.";
  }

  if (category === "Review") {
    return "Classification confidence is low, so manual confirmation is needed.";
  }

  if (signal.evidence !== undefined && signal.evidence.length > 0) {
    return `Matched: ${signal.evidence.slice(0, 2).join(", ")}.`;
  }

  return signal.recommendation;
};

const getSignalText = (signal: EmailSignal): string =>
  `${signal.subject} ${signal.body} ${signal.insight ?? ""} ${
    signal.recommendation
  } ${signal.evidence?.join(" ") ?? ""}`.toLowerCase();

const getAgeLabel = (createdAt: string): string => {
  const createdTime = getTimeValue(createdAt);
  if (createdTime === 0) {
    return "Recent";
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / 60_000),
  );

  if (elapsedMinutes < 1) {
    return "Now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hr`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return elapsedDays === 1 ? "1 day" : `${elapsedDays} days`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(createdTime));
};

const getTimeValue = (isoValue: string): number => {
  const timeValue = Date.parse(isoValue);
  return Number.isNaN(timeValue) ? 0 : timeValue;
};

const getSignalTimeValue = (signal: EmailSignal): number =>
  getTimeValue(signal.receivedAt ?? signal.createdAt);

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
} as const satisfies Record<AttentionPriority, number>;

const replyRequestPatterns = [
  /\b(?:reply|respond|confirm|acknowledge|get back to us|let us know)\b/i,
  /\b(?:send|share|provide).{0,48}(?:availability|times?|slots?|documents?|resume|portfolio|details|information)\b/i,
  /\b(?:are you available|your availability|available for|availability for)\b/i,
  /\b(?:please complete|please submit|please schedule|please choose|please select)\b/i,
] as const;

const deadlinePatterns = [
  /\b(?:deadline|due by|due on|expires?|expiry|within \d+ (?:hours?|days?)|by end of day|eod)\b/i,
  /\b(?:complete|submit|finish).{0,48}(?:before|by|within)\b/i,
] as const;

const schedulingPatterns = [
  /\b(?:schedule|reschedule|book|choose|select|pick).{0,48}(?:time|slot|interview|call|meeting)\b/i,
  /\b(?:calendly|calendar link|google meet|zoom|teams meeting)\b/i,
] as const;
