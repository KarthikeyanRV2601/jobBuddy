import type {
  Application,
  ApplicationFormValues,
  ApplicationStatus,
} from "../types/application";
import { cleanText } from "./text";

export const getEmptyApplicationFormValues = (): ApplicationFormValues => ({
  company: "",
  role: "",
  source: "",
  sourceMessageId: "",
  sourceThreadId: "",
  deadline: "",
  status: "Lead",
  nextAction: "",
  notes: "",
  skillContext: "",
});

export const applicationToFormValues = (
  application: Application,
): ApplicationFormValues => ({
  company: application.company,
  role: application.role,
  source: application.source,
  sourceMessageId: application.sourceMessageId,
  sourceThreadId: application.sourceThreadId,
  deadline: application.deadline,
  status: application.status,
  nextAction: application.nextAction,
  notes: application.notes,
  skillContext: application.skillContext,
});

export const normalizeApplicationFormValues = (
  values: ApplicationFormValues,
): ApplicationFormValues => ({
  company: cleanText(values.company),
  role: cleanText(values.role),
  source: cleanText(values.source),
  sourceMessageId: cleanText(values.sourceMessageId),
  sourceThreadId: cleanText(values.sourceThreadId),
  deadline: values.deadline,
  status: values.status,
  nextAction: cleanText(values.nextAction),
  notes: cleanText(values.notes),
  skillContext: cleanText(values.skillContext),
});

export const toApplicationStatus = (value: string): ApplicationStatus =>
  value as ApplicationStatus;
