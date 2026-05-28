import type { EmailAnalysis, EmailInput, EmailSignal } from "../types/email";
import {
  classifyEmailStatus,
  type EmailClassificationResult,
} from "./emailClassificationModel";
import { createId } from "./id";

export const analyzeEmail = (input: EmailInput): EmailAnalysis => {
  const { scorecard: _scorecard, ...analysis } = classifyEmailStatus(input);
  return analysis;
};

export const classifyEmail = (
  input: EmailInput,
): EmailClassificationResult => classifyEmailStatus(input);

export const createEmailSignal = (
  input: EmailInput,
  nowIso: string,
): EmailSignal => {
  const optionalSourceFields = {
    ...(input.from === undefined ? {} : { from: input.from }),
    ...(input.snippet === undefined ? {} : { snippet: input.snippet }),
  };

  return {
    id: createId(),
    subject: input.subject || "Untitled email",
    body: input.body,
    ...optionalSourceFields,
    sourceMessageId: input.sourceMessageId,
    sourceThreadId: input.sourceThreadId,
    receivedAt: input.receivedAt ?? nowIso,
    ...analyzeEmail(input),
    createdAt: nowIso,
  };
};

export const addEmailSignal = (
  signals: readonly EmailSignal[],
  signal: EmailSignal,
  limit: number,
): readonly EmailSignal[] => [signal, ...signals].slice(0, limit);
