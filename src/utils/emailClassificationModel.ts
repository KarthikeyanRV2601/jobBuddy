import type {
  EmailAnalysis,
  EmailInput,
  EmailSignalStatus,
  SignalTone,
} from "../types/email";

type ClassifiedStatus = Exclude<EmailSignalStatus, "Needs review">;
type ConfidenceBand = NonNullable<EmailAnalysis["confidenceBand"]>;
type EvidenceSection = "subject" | "snippet" | "body" | "sender";

type ClassificationRule = {
  readonly id: string;
  readonly status: ClassifiedStatus;
  readonly tone: Exclude<SignalTone, "unknown">;
  readonly weight: number;
  readonly label: string;
  readonly pattern: RegExp;
};

type SectionMatch = {
  readonly rule: ClassificationRule;
  readonly section: EvidenceSection;
  readonly weightedScore: number;
};

type StatusScore = {
  readonly status: ClassifiedStatus;
  readonly tone: Exclude<SignalTone, "unknown">;
  readonly score: number;
  readonly evidence: readonly string[];
};

export type EmailClassificationResult = EmailAnalysis & {
  readonly scorecard: readonly StatusScore[];
};

type EmailClassificationInput = Pick<
  EmailInput,
  "subject" | "body" | "from" | "snippet"
>;

const MINIMUM_AUTO_CLASSIFY_SCORE = 8;
const HIGH_CONFIDENCE_THRESHOLD = 78;
const MEDIUM_CONFIDENCE_THRESHOLD = 58;

export const classifyEmailStatus = (
  input: EmailClassificationInput,
): EmailClassificationResult => {
  const matches = getSectionMatches(input);
  const scorecard = buildScorecard(matches);
  const best = scorecard[0];

  if (best === undefined || best.score < MINIMUM_AUTO_CLASSIFY_SCORE) {
    return {
      status: "Needs review",
      tone: "unknown",
      confidence: 26,
      confidenceBand: "low",
      keywords: [],
      evidence: [],
      needsReview: true,
      recommendation:
        "Review the email manually before changing the application status.",
      insight:
        "No strong hiring-status signal was found. This may be a generic update, newsletter, or ambiguous recruiter email.",
      scorecard,
    };
  }

  const secondBest = scorecard[1];
  const gap = best.score - (secondBest?.score ?? 0);
  const confidence = getConfidence(best.score, gap, best.status);
  const confidenceBand = getConfidenceBand(confidence);
  const isAmbiguous = secondBest !== undefined && gap <= 4;
  const needsReview =
    confidenceBand === "low" ||
    isAmbiguous ||
    hasContradictoryDecision(best, secondBest);

  return {
    status: best.status,
    tone: best.tone,
    confidence,
    confidenceBand,
    ...(isAmbiguous ? { competingStatus: secondBest.status } : {}),
    keywords: best.evidence,
    evidence: best.evidence,
    needsReview,
    insight: getInsight(best, secondBest, needsReview),
    recommendation: getRecommendation(best.status, needsReview),
    scorecard,
  };
};

const getSectionMatches = (
  input: EmailClassificationInput,
): readonly SectionMatch[] => {
  const sections = getTextSections(input);
  return sections.flatMap(({ section, text, multiplier }) =>
    classificationRules.flatMap((rule) => {
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(text)) {
        return [];
      }

      return [
        {
          rule,
          section,
          weightedScore: rule.weight * multiplier,
        },
      ];
    }),
  );
};

const getTextSections = (
  input: EmailClassificationInput,
): readonly {
  readonly section: EvidenceSection;
  readonly text: string;
  readonly multiplier: number;
}[] => [
  {
    section: "subject",
    text: normalizeEmailText(input.subject),
    multiplier: 1.35,
  },
  {
    section: "snippet",
    text: normalizeEmailText(input.snippet ?? ""),
    multiplier: 1.15,
  },
  {
    section: "body",
    text: normalizeEmailText(input.body),
    multiplier: 1,
  },
  {
    section: "sender",
    text: normalizeEmailText(input.from ?? ""),
    multiplier: 0.55,
  },
];

const buildScorecard = (
  matches: readonly SectionMatch[],
): readonly StatusScore[] => {
  const grouped = new Map<ClassifiedStatus, StatusScore>();

  matches.forEach((match) => {
    const existing = grouped.get(match.rule.status);
    const evidenceLabel = `${match.rule.label} (${match.section})`;
    const evidence = existing?.evidence.includes(evidenceLabel)
      ? existing.evidence
      : [...(existing?.evidence ?? []), evidenceLabel];

    grouped.set(match.rule.status, {
      status: match.rule.status,
      tone: match.rule.tone,
      score: (existing?.score ?? 0) + match.weightedScore,
      evidence,
    });
  });

  return [...grouped.values()].sort(compareScores);
};

const compareScores = (left: StatusScore, right: StatusScore): number => {
  const scoreDelta = right.score - left.score;
  if (Math.abs(scoreDelta) >= 0.01) {
    return scoreDelta;
  }

  return statusPriority[right.status] - statusPriority[left.status];
};

const getConfidence = (
  score: number,
  gap: number,
  status: ClassifiedStatus,
): number => {
  const scoreBase = Math.min(86, 34 + score * 3.2);
  const gapBonus = Math.min(10, Math.max(0, gap) * 1.8);
  const statusBonus = status === "Offer" || status === "Rejected" ? 3 : 0;
  return Math.round(Math.max(34, Math.min(96, scoreBase + gapBonus + statusBonus)));
};

const getConfidenceBand = (confidence: number): ConfidenceBand => {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return "high";
  }

  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
    return "medium";
  }

  return "low";
};

const hasContradictoryDecision = (
  best: StatusScore,
  secondBest: StatusScore | undefined,
): boolean => {
  if (secondBest === undefined) {
    return false;
  }

  const decisionStatuses = new Set<ClassifiedStatus>([
    "Offer",
    "Interview",
    "Rejected",
  ]);
  return (
    decisionStatuses.has(best.status) &&
    decisionStatuses.has(secondBest.status) &&
    best.score - secondBest.score <= 6
  );
};

const getInsight = (
  best: StatusScore,
  secondBest: StatusScore | undefined,
  needsReview: boolean,
): string => {
  const evidence = best.evidence.slice(0, 3).join(", ");
  if (needsReview && secondBest !== undefined) {
    return `Likely ${best.status}, but ${secondBest.status} language also appears. Evidence: ${evidence}.`;
  }

  if (needsReview) {
    return `Likely ${best.status}, but confidence is not high enough for a fully automatic update. Evidence: ${evidence}.`;
  }

  return `Classified as ${best.status} from ${best.evidence.length} weighted signal${
    best.evidence.length === 1 ? "" : "s"
  }: ${evidence}.`;
};

const getRecommendation = (
  status: ClassifiedStatus,
  needsReview: boolean,
): string => {
  if (needsReview) {
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
  } as const satisfies Record<ClassifiedStatus, string>;

  return recommendations[status];
};

const normalizeEmailText = (text: string): string =>
  text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const statusPriority = {
  "Follow-up": 1,
  Rejected: 2,
  Assessment: 3,
  Interview: 4,
  Offer: 5,
} as const satisfies Record<ClassifiedStatus, number>;

const classificationRules = [
  {
    id: "rejected-not-moving-forward",
    status: "Rejected",
    tone: "negative",
    weight: 14,
    label: "not moving forward",
    pattern: /\b(?:not|won't|will not|unable to)\s+(?:be\s+)?(?:moving|move|proceeding|proceed|advancing|advance|continuing|continue)\s+forward\b/i,
  },
  {
    id: "rejected-not-selected",
    status: "Rejected",
    tone: "negative",
    weight: 14,
    label: "not selected",
    pattern: /\b(?:not selected|not been selected|not chosen|not shortlisted|not proceed|not progressed)\b/i,
  },
  {
    id: "rejected-other-candidates",
    status: "Rejected",
    tone: "negative",
    weight: 13,
    label: "other candidates",
    pattern: /\b(?:other candidates|another candidate|other applicants|more closely match|better match|stronger match|more aligned)\b/i,
  },
  {
    id: "rejected-careful-consideration",
    status: "Rejected",
    tone: "negative",
    weight: 11,
    label: "after careful consideration",
    pattern: /\b(?:after careful consideration|after reviewing your application|after reviewing your profile|following careful review)\b/i,
  },
  {
    id: "rejected-regret-unfortunately",
    status: "Rejected",
    tone: "negative",
    weight: 10,
    label: "regret or unfortunately",
    pattern: /\b(?:we regret|regret to inform|unfortunately|sorry to inform|at this time we will not|at this time, we will not)\b/i,
  },
  {
    id: "rejected-no-longer-consideration",
    status: "Rejected",
    tone: "negative",
    weight: 12,
    label: "no longer under consideration",
    pattern: /\b(?:no longer under consideration|not under consideration|will not be considered|no longer being considered)\b/i,
  },
  {
    id: "rejected-unable-offer",
    status: "Rejected",
    tone: "negative",
    weight: 13,
    label: "unable to offer",
    pattern: /\b(?:unable to offer|cannot offer|won't be able to offer|will not be extending an offer|not extend an offer)\b/i,
  },
  {
    id: "rejected-fit",
    status: "Rejected",
    tone: "negative",
    weight: 11,
    label: "not a fit",
    pattern: /\b(?:not a match|not the right fit|not a fit|not the best fit|not a strong fit|does not meet our requirements)\b/i,
  },
  {
    id: "rejected-position-filled",
    status: "Rejected",
    tone: "negative",
    weight: 10,
    label: "position filled or closed",
    pattern: /\b(?:position|role|opening|requisition).{0,32}(?:filled|closed|cancelled|canceled|paused|on hold)\b/i,
  },
  {
    id: "rejected-keep-on-file",
    status: "Rejected",
    tone: "negative",
    weight: 8,
    label: "keep profile on file",
    pattern: /\b(?:keep|retain).{0,32}(?:resume|cv|profile|application).{0,32}(?:on file|for future)\b/i,
  },
  {
    id: "rejected-future-opportunities",
    status: "Rejected",
    tone: "negative",
    weight: 7,
    label: "future opportunities",
    pattern: /\b(?:future opportunities|future openings|future roles|apply again|encourage you to apply)\b/i,
  },
  {
    id: "offer-letter",
    status: "Offer",
    tone: "positive",
    weight: 18,
    label: "offer letter",
    pattern: /\b(?:offer letter|pleased to offer|extend an offer|extending an offer|excited to offer|formal offer)\b/i,
  },
  {
    id: "offer-package",
    status: "Offer",
    tone: "positive",
    weight: 14,
    label: "offer package details",
    pattern: /\b(?:compensation package|base salary|equity grant|signing bonus|employment agreement|start date).{0,96}(?:offer|package|letter|agreement)?\b/i,
  },
  {
    id: "offer-congratulations",
    status: "Offer",
    tone: "positive",
    weight: 10,
    label: "congratulations",
    pattern: /\b(?:congratulations|congrats)\b/i,
  },
  {
    id: "offer-welcome",
    status: "Offer",
    tone: "positive",
    weight: 13,
    label: "welcome to team",
    pattern: /\b(?:welcome aboard|welcome to the team|excited to have you|thrilled to have you join|pleased to have you join)\b/i,
  },
  {
    id: "interview-schedule",
    status: "Interview",
    tone: "positive",
    weight: 14,
    label: "schedule interview",
    pattern: /\b(?:schedule|arrange|set up|book|coordinate)\s+(?:an?\s+)?(?:interview|screen|call|conversation)\b/i,
  },
  {
    id: "interview-invite",
    status: "Interview",
    tone: "positive",
    weight: 13,
    label: "interview invitation",
    pattern: /\b(?:invite|invited|invitation).{0,40}(?:interview|screen|call|conversation)\b/i,
  },
  {
    id: "interview-availability",
    status: "Interview",
    tone: "positive",
    weight: 12,
    label: "availability request",
    pattern: /\b(?:share|provide|send|confirm).{0,40}\bavailability\b/i,
  },
  {
    id: "interview-next-round",
    status: "Interview",
    tone: "positive",
    weight: 12,
    label: "next interview round",
    pattern: /\b(?:next round|technical round|onsite|phone screen|recruiter screen|hiring manager round|panel interview)\b/i,
  },
  {
    id: "interview-calendly",
    status: "Interview",
    tone: "positive",
    weight: 11,
    label: "scheduling link",
    pattern: /\b(?:calendly|calendar link|schedule a time|choose a time|pick a time|select a slot)\b/i,
  },
  {
    id: "interview-selected",
    status: "Interview",
    tone: "positive",
    weight: 11,
    label: "selected for interview",
    pattern: /\b(?:selected|shortlisted|chosen).{0,40}(?:interview|screen|next step|next round)\b/i,
  },
  {
    id: "interview-meet-team",
    status: "Interview",
    tone: "positive",
    weight: 9,
    label: "meet the team",
    pattern: /\b(?:meet with|speak with|chat with).{0,40}(?:team|hiring manager|engineer|panel|recruiter)\b/i,
  },
  {
    id: "assessment-keywords",
    status: "Assessment",
    tone: "neutral",
    weight: 13,
    label: "assessment",
    pattern: /\b(?:assessment|coding challenge|take-home|take home|assignment|online test|technical test|skills test|hackerrank|codility|codesignal|karat)\b/i,
  },
  {
    id: "assessment-complete",
    status: "Assessment",
    tone: "neutral",
    weight: 11,
    label: "complete assessment",
    pattern: /\b(?:complete|submit|finish).{0,40}(?:test|assessment|challenge|assignment|exercise)\b/i,
  },
  {
    id: "assessment-deadline",
    status: "Assessment",
    tone: "neutral",
    weight: 9,
    label: "assessment deadline",
    pattern: /\b(?:assessment|test|challenge|assignment|exercise).{0,80}(?:due by|deadline|within \d+ days|within \d+ hours|expires on|before midnight)\b/i,
  },
  {
    id: "followup-invited-to-apply",
    status: "Follow-up",
    tone: "neutral",
    weight: 8,
    label: "invited to apply",
    pattern: /\b(?:invited to apply|invite you to apply|apply to this job|job invitation)\b/i,
  },
  {
    id: "followup-candidate-account",
    status: "Follow-up",
    tone: "neutral",
    weight: 9,
    label: "candidate account setup",
    pattern: /\b(?:verify|confirm|activate|complete setup).{0,60}(?:candidate account|email address|account setup|profile)\b/i,
  },
  {
    id: "followup-application-received",
    status: "Follow-up",
    tone: "neutral",
    weight: 10,
    label: "application received",
    pattern: /\b(?:thank you for applying|thank you for your application|application received|we received your application|received your application|thanks for applying|completed your application)\b/i,
  },
  {
    id: "followup-submitted",
    status: "Follow-up",
    tone: "neutral",
    weight: 9,
    label: "application submitted",
    pattern: /\b(?:application submitted|successfully submitted|submission confirmation|thanks for your interest|thank you for your interest)\b/i,
  },
  {
    id: "followup-under-review",
    status: "Follow-up",
    tone: "neutral",
    weight: 8,
    label: "reviewing application",
    pattern: /\b(?:under review|currently reviewing|reviewing your application|application is under review|in review|review your application|give your application the attention)\b/i,
  },
  {
    id: "followup-if-match-reach-out",
    status: "Follow-up",
    tone: "neutral",
    weight: 8,
    label: "will reach out if match",
    pattern: /\b(?:if|should)\s+(?:our\s+)?(?:team|recruiter|hiring team).{0,80}(?:match|fit|good fit).{0,80}(?:reach out|contact|be in touch|initial screen)\b/i,
  },
  {
    id: "followup-next-steps",
    status: "Follow-up",
    tone: "neutral",
    weight: 6,
    label: "next steps soon",
    pattern: /\b(?:next steps|update|hear from us|we will be in touch|we'll be in touch|follow up).{0,56}(?:soon|shortly|coming days|next week)?\b/i,
  },
] as const satisfies readonly ClassificationRule[];
