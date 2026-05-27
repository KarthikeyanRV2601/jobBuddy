export type EmailSignalStatus =
  | "Rejected"
  | "Interview"
  | "Offer"
  | "Assessment"
  | "Follow-up"
  | "Needs review";

export type SignalTone = "positive" | "negative" | "neutral" | "unknown";

export type EmailInput = {
  readonly subject: string;
  readonly body: string;
  readonly sourceMessageId: string;
  readonly sourceThreadId: string;
  readonly receivedAt?: string;
};

export type EmailAnalysis = {
  readonly status: EmailSignalStatus;
  readonly tone: SignalTone;
  readonly confidence: number;
  readonly keywords: readonly string[];
  readonly evidence?: readonly string[];
  readonly insight?: string;
  readonly recommendation: string;
};

export type EmailSignal = EmailInput &
  EmailAnalysis & {
    readonly id: string;
    readonly createdAt: string;
    readonly receivedAt?: string;
  };

export type EmailSignalRule = {
  readonly status: Exclude<EmailSignalStatus, "Needs review">;
  readonly tone: Exclude<SignalTone, "unknown">;
  readonly keywords: readonly string[];
};
