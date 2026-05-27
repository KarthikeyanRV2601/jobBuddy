import type {
  Application,
  ApplicationFilters,
  ApplicationStatus,
} from "../types/application";
import { APPLICATION_STATUSES } from "../types/application";

export type ApplicationFilterCard = {
  readonly label: ApplicationStatus | "All";
  readonly count: number;
};

export const getDefaultApplicationFilters = (): ApplicationFilters => ({
  query: "",
  status: "All",
});

export const updateApplicationQuery = (
  filters: ApplicationFilters,
  query: string,
): ApplicationFilters => ({
  ...filters,
  query,
});

export const updateApplicationStatusFilter = (
  filters: ApplicationFilters,
  status: ApplicationStatus | "All",
): ApplicationFilters => ({
  ...filters,
  status,
});

export const toApplicationStatusFilter = (
  value: string,
): ApplicationStatus | "All" => value as ApplicationStatus | "All";

export const getApplicationFilterCards = (
  applications: readonly Application[],
): readonly ApplicationFilterCard[] => [
  {
    label: "All",
    count: applications.length,
  },
  ...APPLICATION_STATUSES.map((status) => ({
    label: status,
    count: applications.filter((application) => application.status === status)
      .length,
  })),
];
