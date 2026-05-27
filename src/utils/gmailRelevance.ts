import type { GmailMessage } from "../types/gmail";

type RelevanceRule = {
  readonly weight: number;
  readonly pattern: RegExp;
};

const relevanceRules = [
  { weight: 10, pattern: /\b(?:thank you for applying|application received|your application|job application)\b/i },
  { weight: 10, pattern: /\b(?:not moving forward|not selected|after careful consideration|other candidates|no longer under consideration)\b/i },
  { weight: 9, pattern: /\b(?:schedule|invite|invited|availability).{0,40}\b(?:interview|screen|call|conversation)\b/i },
  { weight: 9, pattern: /\b(?:offer letter|extend an offer|pleased to offer|compensation package)\b/i },
  { weight: 8, pattern: /\b(?:assessment|coding challenge|take-home|assignment|hackerrank|codility)\b/i },
  { weight: 7, pattern: /\b(?:recruiter|recruiting|talent acquisition|hiring team|careers team)\b/i },
  { weight: 6, pattern: /\b(?:greenhouse|lever|workday|smartrecruiters|ashby|icims|jobvite|myworkdayjobs)\b/i },
  { weight: 5, pattern: /\b(?:role|position|opening|candidate|candidacy|next steps|under review)\b/i },
] as const satisfies readonly RelevanceRule[];

const exclusionRules = [
  /\b(?:job alert|new jobs|recommended jobs|jobs you may like|weekly jobs|daily jobs)\b/i,
  /\b(?:newsletter|webinar|event invitation|course|bootcamp)\b/i,
  /\b(?:promoted|sponsored)\b/i,
] as const;

export const isApplicationRelatedMessage = (message: GmailMessage): boolean => {
  const text = [
    message.subject,
    message.from,
    message.snippet,
    message.bodyText.slice(0, 12000),
  ].join("\n");

  const exclusionScore = exclusionRules.filter((rule) => rule.test(text)).length;
  const relevanceScore = relevanceRules.reduce(
    (score, rule) => score + (rule.pattern.test(text) ? rule.weight : 0),
    0,
  );

  return relevanceScore >= 8 && exclusionScore === 0;
};
