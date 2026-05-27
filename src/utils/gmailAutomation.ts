import type { Application, ApplicationStatus } from "../types/application";
import type { EmailSignal } from "../types/email";
import type {
  GmailMessage,
  GmailSyncOptions,
  GmailSyncResult,
} from "../types/gmail";
import { createApplication, upsertApplication } from "./applications";
import { shouldAutoUpdateFromSignal } from "./emailTriage";
import { createEmailSignal } from "./emails";
import { fetchGmailMessages, fetchGmailProfile } from "./gmailApi";
import { isApplicationRelatedMessage } from "./gmailRelevance";

const EMAIL_SIGNAL_LIMIT = 5000;

export type GmailAutomationResult = GmailSyncResult & {
  readonly applications: readonly Application[];
};

export const syncGmailAndBuildTracker = async (
  options: GmailSyncOptions,
  existingApplications: readonly Application[],
  existingSignals: readonly EmailSignal[],
): Promise<GmailAutomationResult> => {
  const [profile, fetchedMessages] = await Promise.all([
    fetchGmailProfile(options.accessToken),
    fetchGmailMessages(options),
  ]);
  const messages = fetchedMessages.filter(isApplicationRelatedMessage);
  const nowIso = new Date().toISOString();
  const signals = messages.map((message) => {
    const receivedAt = getMessageDateIso(message, nowIso);
    return compactEmailSignal(
      createEmailSignal(
        {
          subject: message.subject,
          body: getMessageAnalysisText(message),
          sourceMessageId: message.id,
          sourceThreadId: message.threadId,
          receivedAt,
        },
        nowIso,
      ),
    );
  });

  const applications = messages.reduce<readonly Application[]>(
    (currentApplications, message, index) => {
      const signal = signals[index];
      if (signal === undefined) {
        return currentApplications;
      }

      return upsertApplication(
        currentApplications,
        gmailMessageToApplication(
          message,
          signal,
          currentApplications,
          getMessageDateIso(message, nowIso),
        ),
      );
    },
    existingApplications,
  );

  const nextSignals = mergeEmailSignals(existingSignals, signals);

  return {
    profile,
    messages,
    signals: nextSignals,
    fetchedCount: fetchedMessages.length,
    matchedCount: messages.length,
    updatedApplicationsCount: applications.length - existingApplications.length,
    syncedAt: nowIso,
    applications,
  };
};

const gmailMessageToApplication = (
  message: GmailMessage,
  signal: EmailSignal,
  applications: readonly Application[],
  nowIso: string,
): Application => {
  const existingApplication = findExistingApplication(applications, message);
  const inferred = inferApplicationFromMessage(message);
  const canAutoUpdate = shouldAutoUpdateFromSignal(signal);
  const status = canAutoUpdate
    ? emailSignalToApplicationStatus(signal.status)
    : existingApplication?.status ?? "Applied";

  return createApplication(
    {
      company: existingApplication?.company ?? inferred.company,
      role: existingApplication?.role ?? inferred.role,
      source: `Gmail · ${message.from}`,
      sourceMessageId: message.id,
      sourceThreadId: message.threadId,
      deadline: existingApplication?.deadline ?? "",
      status,
      nextAction: canAutoUpdate
        ? getNextAction(status)
        : "Review email classification",
      notes: buildApplicationNotes(message, signal),
      skillContext: existingApplication?.skillContext ?? "",
      ...getExistingApplicationIdentity(existingApplication),
    },
    nowIso,
  );
};

const getExistingApplicationIdentity = (
  application: Application | null,
): { readonly id?: string; readonly existingCreatedAt?: string } => {
  if (application === null) {
    return {};
  }

  return {
    id: application.id,
    existingCreatedAt: application.createdAt,
  };
};

const getMessageAnalysisText = (message: GmailMessage): string =>
  [
    `gmail-message-id:${message.id}`,
    message.subject,
    message.from,
    message.snippet,
    message.bodyText,
  ].join("\n");

const getMessageDateIso = (
  message: GmailMessage,
  fallbackIso: string,
): string => {
  const internalDate = Number(message.internalDate);
  if (!Number.isNaN(internalDate) && internalDate > 0) {
    return new Date(internalDate).toISOString();
  }

  const parsedDate = new Date(message.date);
  return Number.isNaN(parsedDate.getTime()) ? fallbackIso : parsedDate.toISOString();
};

const compactEmailSignal = (signal: EmailSignal): EmailSignal => ({
  ...signal,
  body: "",
});

const mergeEmailSignals = (
  existingSignals: readonly EmailSignal[],
  newSignals: readonly EmailSignal[],
): readonly EmailSignal[] => {
  const signalsByMessageId = new Map<string, EmailSignal>();

  [...newSignals, ...existingSignals].forEach((signal) => {
    const key = getSignalCacheKey(signal);
    if (!signalsByMessageId.has(key)) {
      signalsByMessageId.set(key, signal);
    }
  });

  return [...signalsByMessageId.values()]
    .sort(
      (left, right) =>
        getSignalTimeValue(right) - getSignalTimeValue(left),
    )
    .slice(0, EMAIL_SIGNAL_LIMIT);
};

const getSignalCacheKey = (signal: EmailSignal): string =>
  signal.sourceMessageId || signal.sourceThreadId || signal.id;

const getSignalTimeValue = (signal: EmailSignal): number => {
  const parsedDate = Date.parse(signal.receivedAt ?? signal.createdAt);
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
};

const findExistingApplication = (
  applications: readonly Application[],
  message: GmailMessage,
): Application | null => {
  const sourceMatch = applications.find(
    (application) =>
      application.sourceMessageId === message.id ||
      application.sourceThreadId === message.threadId,
  );

  if (sourceMatch !== undefined) {
    return sourceMatch;
  }

  const inferred = inferApplicationFromMessage(message);
  return (
    applications.find(
      (application) =>
        application.company.toLowerCase() === inferred.company.toLowerCase() &&
        application.role.toLowerCase() === inferred.role.toLowerCase(),
    ) ?? null
  );
};

const inferApplicationFromMessage = (
  message: GmailMessage,
): Pick<Application, "company" | "role"> => {
  const fromCompany = inferCompanyFromSender(message.from);
  const subjectRole = inferRoleFromSubject(message.subject);

  return {
    company: fromCompany || "Unknown company",
    role: subjectRole || "Unknown role",
  };
};

const inferCompanyFromSender = (from: string): string => {
  const bracketMatch = /<[^@<>]+@([^<>]+)>/.exec(from);
  const emailDomain = bracketMatch?.[1] ?? /@([^\s>]+)/.exec(from)?.[1] ?? "";
  const domainPart = emailDomain.split(".").filter(Boolean)[0] ?? "";
  const displayName = from.replace(/<.*>/, "").replaceAll('"', "").trim();

  if (displayName.length > 0 && !displayName.includes("@")) {
    return displayName.replace(/\s*(careers|jobs|recruiting|talent)\s*/gi, "").trim();
  }

  return titleCase(domainPart.replaceAll("-", " "));
};

const inferRoleFromSubject = (subject: string): string => {
  const patterns = [
    /application for (?:the )?(.+?)(?: role| position| opening|$)/i,
    /your application to (.+?)(?: at |$)/i,
    /(.+?) application/i,
    /interview for (?:the )?(.+?)(?: role| position|$)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(subject);
    const role = match?.[1]?.trim();
    if (role !== undefined && role.length > 2) {
      return titleCase(role);
    }
  }

  return "Unknown role";
};

const emailSignalToApplicationStatus = (
  signalStatus: EmailSignal["status"],
): ApplicationStatus => {
  const statusMap = {
    Rejected: "Rejected",
    Interview: "Interview",
    Offer: "Offer",
    Assessment: "Assessment",
    "Follow-up": "Applied",
    "Needs review": "Applied",
  } as const satisfies Record<EmailSignal["status"], ApplicationStatus>;

  return statusMap[signalStatus];
};

const getNextAction = (status: ApplicationStatus): string => {
  const actionMap = {
    Lead: "Review lead and decide whether to apply",
    Applied: "Watch Gmail for the next update",
    Assessment: "Complete assessment before the deadline",
    Interview: "Prepare interview notes and examples",
    Offer: "Review offer details and decision deadline",
    Rejected: "Archive, capture lessons, and replace with a fresh lead",
    Archived: "No action",
  } as const satisfies Record<ApplicationStatus, string>;

  return actionMap[status];
};

const buildApplicationNotes = (
  message: GmailMessage,
  signal: EmailSignal,
): string =>
  [
    `Imported from Gmail on ${new Date().toLocaleString()}.`,
    `Subject: ${message.subject || "No subject"}`,
    `From: ${message.from || "Unknown sender"}`,
    `Signal: ${signal.status} (${signal.confidence}% confidence).`,
    signal.recommendation,
  ].join("\n");

const titleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
