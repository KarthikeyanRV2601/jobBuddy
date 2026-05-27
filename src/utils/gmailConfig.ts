export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

export const DEFAULT_GMAIL_QUERY =
  '("thank you for applying" OR "application received" OR "your application" OR "job application" OR "application status" OR "application update" OR "under review" OR "next steps" OR "not moving forward" OR "not selected" OR "after careful consideration" OR "other candidates" OR "offer letter" OR interview OR assessment OR "coding challenge" OR "take-home" OR recruiter OR recruiting OR careers OR greenhouse OR lever OR workday OR smartrecruiters OR ashby OR icims OR jobvite) newer_than:180d';

export const DEFAULT_GMAIL_DAYS = 180;

export const getGoogleClientId = (): string =>
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export const hasGoogleClientId = (): boolean => getGoogleClientId().length > 0;
