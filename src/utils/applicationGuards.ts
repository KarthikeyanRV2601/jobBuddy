import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "../types/application";

export const isApplicationStatus = (value: unknown): value is ApplicationStatus =>
  typeof value === "string" &&
  APPLICATION_STATUSES.some((status) => status === value);

export const isApplication = (value: unknown): value is Application => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.company === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.sourceMessageId === "string" &&
    typeof candidate.sourceThreadId === "string" &&
    typeof candidate.deadline === "string" &&
    isApplicationStatus(candidate.status) &&
    typeof candidate.nextAction === "string" &&
    typeof candidate.notes === "string" &&
    typeof candidate.skillContext === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
};

export const isApplicationList = (value: unknown): value is readonly Application[] =>
  Array.isArray(value) && value.every(isApplication);
