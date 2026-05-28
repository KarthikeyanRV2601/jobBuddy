import type { EmailSignal, EmailSignalStatus, SignalTone } from "../types/email";

const EMAIL_SIGNAL_STATUSES = [
  "Rejected",
  "Interview",
  "Offer",
  "Assessment",
  "Follow-up",
  "Needs review",
] as const satisfies readonly EmailSignalStatus[];

const SIGNAL_TONES = [
  "positive",
  "negative",
  "neutral",
  "unknown",
] as const satisfies readonly SignalTone[];

const isEmailSignalStatus = (value: unknown): value is EmailSignalStatus =>
  typeof value === "string" &&
  EMAIL_SIGNAL_STATUSES.some((status) => status === value);

const isSignalTone = (value: unknown): value is SignalTone =>
  typeof value === "string" && SIGNAL_TONES.some((tone) => tone === value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const isEmailSignal = (value: unknown): value is EmailSignal => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.body === "string" &&
    (candidate.from === undefined || typeof candidate.from === "string") &&
    (candidate.snippet === undefined || typeof candidate.snippet === "string") &&
    typeof candidate.sourceMessageId === "string" &&
    typeof candidate.sourceThreadId === "string" &&
    isEmailSignalStatus(candidate.status) &&
    isSignalTone(candidate.tone) &&
    typeof candidate.confidence === "number" &&
    isStringArray(candidate.keywords) &&
    (candidate.evidence === undefined || isStringArray(candidate.evidence)) &&
    (candidate.needsReview === undefined ||
      typeof candidate.needsReview === "boolean") &&
    (candidate.competingStatus === undefined ||
      isEmailSignalStatus(candidate.competingStatus)) &&
    (candidate.confidenceBand === undefined ||
      candidate.confidenceBand === "low" ||
      candidate.confidenceBand === "medium" ||
      candidate.confidenceBand === "high") &&
    (candidate.insight === undefined || typeof candidate.insight === "string") &&
    typeof candidate.recommendation === "string" &&
    typeof candidate.createdAt === "string"
  );
};

export const isEmailSignalList = (value: unknown): value is readonly EmailSignal[] =>
  Array.isArray(value) && value.every(isEmailSignal);
