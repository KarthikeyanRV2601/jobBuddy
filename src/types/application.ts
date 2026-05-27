export const APPLICATION_STATUSES = [
  "Lead",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Archived",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type PipelineMetricKey = "active" | "interview" | "offer" | "rejected";

export type Application = {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly source: string;
  readonly sourceMessageId: string;
  readonly sourceThreadId: string;
  readonly deadline: string;
  readonly status: ApplicationStatus;
  readonly nextAction: string;
  readonly notes: string;
  readonly skillContext: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ApplicationFormValues = {
  readonly company: string;
  readonly role: string;
  readonly source: string;
  readonly sourceMessageId: string;
  readonly sourceThreadId: string;
  readonly deadline: string;
  readonly status: ApplicationStatus;
  readonly nextAction: string;
  readonly notes: string;
  readonly skillContext: string;
};

export type ApplicationDraft = ApplicationFormValues & {
  readonly id?: string;
  readonly existingCreatedAt?: string;
};

export type ApplicationMetrics = Record<PipelineMetricKey, number>;

export type ApplicationFilters = {
  readonly query: string;
  readonly status: ApplicationStatus | "All";
};
