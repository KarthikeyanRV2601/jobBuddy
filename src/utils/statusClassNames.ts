import type { ApplicationStatus } from "../types/application";
import type { EmailSignalStatus } from "../types/email";

type PillStatus = ApplicationStatus | EmailSignalStatus;

export const getStatusPillClassName = (status: PillStatus): string =>
  `pill ${status.toLowerCase().replaceAll(" ", "-")}`;
