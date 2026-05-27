import type {
  EmailAnalysis,
  EmailInput,
  EmailSignal,
  EmailSignalStatus,
  SignalTone,
} from "../types/email";
import { createId } from "./id";

type ClassifierStatus = Exclude<EmailSignalStatus, "Needs review">;

type WeightedRule = {
  readonly status: ClassifierStatus;
  readonly tone: Exclude<SignalTone, "unknown">;
  readonly weight: number;
  readonly label: string;
  readonly pattern: RegExp;
};

type StatusMatch = {
  readonly status: ClassifierStatus;
  readonly tone: Exclude<SignalTone, "unknown">;
  readonly score: number;
  readonly evidence: readonly string[];
};

const weightedRules = [
  {
    status: "Rejected",
    tone: "negative",
    weight: 12,
    label: "not moving forward",
    pattern: /\b(?:not|won't|will not)\s+(?:be\s+)?(?:moving|proceeding|advancing|continuing)\s+forward\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 12,
    label: "not selected",
    pattern: /\b(?:not selected|not been selected|not chosen|not shortlisted)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 11,
    label: "other candidates",
    pattern: /\b(?:other candidates|another candidate|more closely match|better match|stronger match)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 11,
    label: "proceeding with others",
    pattern: /\b(?:decided|chosen|elected|proceeding|moving forward).{0,48}(?:other candidates|other applicants|other individuals|another candidate)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 10,
    label: "unable to offer",
    pattern: /\b(?:unable to offer|cannot offer|won't be able to offer|will not be extending an offer)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 9,
    label: "after careful consideration",
    pattern: /\bafter careful consideration\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 9,
    label: "position filled",
    pattern: /\b(?:position|role|opening)\s+(?:has been|is)\s+filled\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 8,
    label: "regret/unfortunately",
    pattern: /\b(?:we regret|regret to inform|unfortunately|sorry to inform)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 7,
    label: "no longer under consideration",
    pattern: /\b(?:no longer under consideration|not under consideration|will not be considered)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 10,
    label: "not continue candidacy",
    pattern: /\b(?:not continue|not continuing|unable to continue|cannot continue).{0,32}(?:candidacy|application|process)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 10,
    label: "not a match",
    pattern: /\b(?:not a match|not the right fit|not a fit|not the best fit|not a strong fit)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 9,
    label: "decline application",
    pattern: /\b(?:decline|declined|reject|rejected).{0,32}(?:application|candidacy|profile)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 9,
    label: "pursue other applicants",
    pattern: /\b(?:pursue|move forward with|continue with|proceed with).{0,48}(?:other applicants|other candidates|candidates whose|applicants whose)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 8,
    label: "keep resume on file",
    pattern: /\b(?:keep|retain).{0,24}(?:resume|cv|profile).{0,24}(?:on file|for future)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 7,
    label: "future opportunities",
    pattern: /\b(?:future opportunities|future openings|future roles|apply again|encourage you to apply)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 8,
    label: "hiring needs changed",
    pattern: /\b(?:hiring needs|business needs|role requirements|position requirements).{0,32}(?:changed|shifted|evolved)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 8,
    label: "role closed",
    pattern: /\b(?:role|position|opening|requisition).{0,24}(?:closed|cancelled|canceled|paused|on hold)\b/i,
  },
  {
    status: "Rejected",
    tone: "negative",
    weight: 8,
    label: "do not have next step",
    pattern: /\b(?:do not have|don't have|will not have).{0,32}(?:next step|next steps|additional step|further step)\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 12,
    label: "schedule interview",
    pattern: /\b(?:schedule|arrange|set up|book)\s+(?:an?\s+)?(?:interview|screen|call|conversation)\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 11,
    label: "availability request",
    pattern: /\b(?:share|provide|send).{0,32}\bavailability\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 10,
    label: "next round",
    pattern: /\b(?:next round|technical round|onsite|phone screen|recruiter screen|hiring manager)\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 9,
    label: "move forward",
    pattern: /\b(?:like|love|want|excited)\s+to\s+move\s+forward\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 11,
    label: "invite to interview",
    pattern: /\b(?:invite|invited|invitation).{0,32}(?:interview|screen|call|conversation)\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 10,
    label: "selected for interview",
    pattern: /\b(?:selected|shortlisted|chosen).{0,32}(?:interview|screen|next step|next round)\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 10,
    label: "calendly scheduling",
    pattern: /\b(?:calendly|calendar link|schedule a time|choose a time|pick a time)\b/i,
  },
  {
    status: "Interview",
    tone: "positive",
    weight: 9,
    label: "meet the team",
    pattern: /\b(?:meet with|speak with|chat with).{0,32}(?:team|hiring manager|engineer|panel|recruiter)\b/i,
  },
  {
    status: "Offer",
    tone: "positive",
    weight: 16,
    label: "offer letter",
    pattern: /\b(?:offer letter|pleased to offer|extend an offer|excited to offer|compensation package)\b/i,
  },
  {
    status: "Offer",
    tone: "positive",
    weight: 10,
    label: "congratulations",
    pattern: /\bcongratulations\b/i,
  },
  {
    status: "Offer",
    tone: "positive",
    weight: 14,
    label: "offer details",
    pattern: /\b(?:start date|base salary|equity|benefits|signing bonus|employment agreement).{0,80}(?:offer|package|letter)?\b/i,
  },
  {
    status: "Offer",
    tone: "positive",
    weight: 13,
    label: "welcome aboard",
    pattern: /\b(?:welcome aboard|welcome to the team|joining our team|excited to have you)\b/i,
  },
  {
    status: "Assessment",
    tone: "neutral",
    weight: 11,
    label: "assessment",
    pattern: /\b(?:assessment|coding challenge|take-home|take home|assignment|online test|hackerrank|codility)\b/i,
  },
  {
    status: "Assessment",
    tone: "neutral",
    weight: 10,
    label: "complete test",
    pattern: /\b(?:complete|submit|finish).{0,32}(?:test|assessment|challenge|assignment|exercise)\b/i,
  },
  {
    status: "Assessment",
    tone: "neutral",
    weight: 9,
    label: "deadline",
    pattern: /\b(?:due by|deadline|within \d+ days|within \d+ hours|expires on)\b/i,
  },
  {
    status: "Follow-up",
    tone: "neutral",
    weight: 7,
    label: "application received",
    pattern: /\b(?:thank you for applying|application received|we received your application|received your application)\b/i,
  },
  {
    status: "Follow-up",
    tone: "neutral",
    weight: 6,
    label: "under review",
    pattern: /\b(?:under review|currently reviewing|reviewing your application|application is under review|in review)\b/i,
  },
  {
    status: "Follow-up",
    tone: "neutral",
    weight: 6,
    label: "next steps soon",
    pattern: /\b(?:next steps|update|hear from us|we will be in touch|we'll be in touch|follow up).{0,48}(?:soon|shortly|coming days|next week)?\b/i,
  },
  {
    status: "Follow-up",
    tone: "neutral",
    weight: 5,
    label: "application submitted",
    pattern: /\b(?:application submitted|successfully submitted|submission confirmation|thanks for your interest)\b/i,
  },
] as const satisfies readonly WeightedRule[];

export const analyzeEmail = (input: EmailInput): EmailAnalysis => {
  const text = normalizeEmailText(`${input.subject}\n${input.body}`);
  const matches = scoreText(text);
  const best = matches[0];

  if (best === undefined || best.score < 7) {
    return {
      status: "Needs review",
      tone: "unknown",
      confidence: 28,
      keywords: [],
      evidence: [],
      insight:
        "No strong hiring-status signal was found. This may be a generic update, newsletter, or ambiguous recruiter email.",
      recommendation:
        "Review the email manually before changing the application status.",
    };
  }

  const secondBest = matches[1];
  const isAmbiguous =
    secondBest !== undefined && best.score - secondBest.score <= 3;

  return {
    status: best.status,
    tone: best.tone,
    confidence: getConfidence(best.score, secondBest?.score ?? 0, isAmbiguous),
    keywords: best.evidence,
    evidence: best.evidence,
    insight: getInsight(best, secondBest),
    recommendation: getRecommendation(best.status, isAmbiguous),
  };
};

export const createEmailSignal = (
  input: EmailInput,
  nowIso: string,
): EmailSignal => ({
  id: createId(),
  subject: input.subject || "Untitled email",
  body: input.body,
  sourceMessageId: input.sourceMessageId,
  sourceThreadId: input.sourceThreadId,
  receivedAt: input.receivedAt ?? nowIso,
  ...analyzeEmail(input),
  createdAt: nowIso,
});

export const addEmailSignal = (
  signals: readonly EmailSignal[],
  signal: EmailSignal,
  limit: number,
): readonly EmailSignal[] => [signal, ...signals].slice(0, limit);

const scoreText = (text: string): readonly StatusMatch[] => {
  const grouped = new Map<ClassifierStatus, StatusMatch>();

  weightedRules.forEach((rule) => {
    if (!rule.pattern.test(text)) {
      return;
    }

    const existing = grouped.get(rule.status);
    grouped.set(rule.status, {
      status: rule.status,
      tone: rule.tone,
      score: (existing?.score ?? 0) + rule.weight,
      evidence: [...(existing?.evidence ?? []), rule.label],
    });
  });

  return [...grouped.values()].sort((left, right) => right.score - left.score);
};

const normalizeEmailText = (text: string): string =>
  text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getConfidence = (
  score: number,
  secondScore: number,
  isAmbiguous: boolean,
): number => {
  const base = Math.min(94, 38 + score * 4);
  const separationBonus = Math.min(12, Math.max(0, score - secondScore) * 2);
  return Math.max(35, Math.min(96, base + separationBonus - (isAmbiguous ? 12 : 0)));
};

const getInsight = (
  best: StatusMatch,
  secondBest: StatusMatch | undefined,
): string => {
  const evidence = best.evidence.slice(0, 3).join(", ");
  if (secondBest !== undefined && best.score - secondBest.score <= 3) {
    return `Likely ${best.status}, but there is competing ${secondBest.status} language. Evidence: ${evidence}.`;
  }

  return `Classified as ${best.status} from ${best.evidence.length} signal${
    best.evidence.length === 1 ? "" : "s"
  }: ${evidence}.`;
};

const getRecommendation = (
  status: Exclude<EmailAnalysis["status"], "Needs review">,
  isAmbiguous: boolean,
): string => {
  if (isAmbiguous) {
    return "Open the email, confirm the status, then update or keep the tracker entry.";
  }

  const recommendations = {
    Rejected:
      "Mark the matching application as Rejected, save any feedback, and queue one replacement application.",
    Interview:
      "Move the application to Interview and add preparation notes for the next round.",
    Offer:
      "Move the application to Offer and capture compensation, deadline, and negotiation notes.",
    Assessment:
      "Move the application to Assessment and add the test deadline as the next action.",
    "Follow-up":
      "Keep the application active and set a follow-up reminder if there is no update within a week.",
  } as const;

  return recommendations[status];
};
