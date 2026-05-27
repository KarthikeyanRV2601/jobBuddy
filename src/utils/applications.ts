import type {
  Application,
  ApplicationDraft,
  ApplicationFilters,
  ApplicationMetrics,
  ApplicationStatus,
} from "../types/application";
import { createId } from "./id";
import { toSearchText } from "./text";

const metricStatusMap = {
  active: ["Lead", "Applied", "Assessment"],
  interview: ["Interview"],
  offer: ["Offer"],
  rejected: ["Rejected"],
} as const satisfies Record<keyof ApplicationMetrics, readonly ApplicationStatus[]>;

export const createApplication = (
  draft: ApplicationDraft,
  nowIso: string,
): Application => ({
  id: draft.id ?? createId(),
  company: draft.company,
  role: draft.role,
  source: draft.source,
  sourceMessageId: draft.sourceMessageId,
  sourceThreadId: draft.sourceThreadId,
  deadline: draft.deadline,
  status: draft.status,
  nextAction: draft.nextAction,
  notes: draft.notes,
  skillContext: draft.skillContext,
  createdAt: draft.existingCreatedAt ?? nowIso,
  updatedAt: nowIso,
});

export const upsertApplication = (
  applications: readonly Application[],
  application: Application,
): readonly Application[] => {
  const exists = applications.some((item) => item.id === application.id);
  if (!exists) {
    return [application, ...applications];
  }

  return applications.map((item) =>
    item.id === application.id ? application : item,
  );
};

export const deleteApplication = (
  applications: readonly Application[],
  id: string,
): readonly Application[] => applications.filter((item) => item.id !== id);

export const getApplicationById = (
  applications: readonly Application[],
  id: string | null,
): Application | null => applications.find((item) => item.id === id) ?? null;

export const getApplicationMetrics = (
  applications: readonly Application[],
): ApplicationMetrics => ({
  active: countByStatuses(applications, metricStatusMap.active),
  interview: countByStatuses(applications, metricStatusMap.interview),
  offer: countByStatuses(applications, metricStatusMap.offer),
  rejected: countByStatuses(applications, metricStatusMap.rejected),
});

export const filterApplications = (
  applications: readonly Application[],
  filters: ApplicationFilters,
): readonly Application[] => {
  const query = filters.query.toLowerCase();

  return applications.filter((application) => {
    const searchable = toSearchText([
      application.company,
      application.role,
      application.source,
      application.status,
      application.nextAction,
      application.notes,
      application.skillContext,
    ]);

    const matchesQuery = searchable.includes(query);
    const matchesStatus =
      filters.status === "All" || application.status === filters.status;

    return matchesQuery && matchesStatus;
  });
};

export const getSampleApplications = (nowIso: string): readonly Application[] => [
  createApplication(
    {
      company: "Northstar Analytics",
      role: "Frontend Engineer",
      source: "LinkedIn",
      sourceMessageId: "",
      sourceThreadId: "",
      deadline: "",
      status: "Applied",
      nextAction: "Follow up with recruiter",
      notes: "Submitted after tailoring portfolio examples for dashboard work.",
      skillContext:
        "React, TypeScript, accessibility, performance tuning, chart-heavy UI work.",
    },
    nowIso,
  ),
  createApplication(
    {
      company: "Aster Cloud",
      role: "Full Stack Developer",
      source: "Company careers page",
      sourceMessageId: "",
      sourceThreadId: "",
      deadline: "",
      status: "Interview",
      nextAction: "Prepare API design examples",
      notes: "Recruiter screen completed. Technical round pending.",
      skillContext:
        "Node.js, Postgres, production debugging, user-facing workflow automation.",
    },
    nowIso,
  ),
];

const countByStatuses = (
  applications: readonly Application[],
  statuses: readonly ApplicationStatus[],
): number =>
  applications.filter((application) => statuses.includes(application.status))
    .length;
