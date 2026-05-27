import type { EmailInput } from "../types/email";

export const getEmptyEmailInput = (): EmailInput => ({
  subject: "",
  body: "",
  sourceMessageId: "",
  sourceThreadId: "",
});
