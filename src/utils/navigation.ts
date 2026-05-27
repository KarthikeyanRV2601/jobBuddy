import type { ApplicationMetrics } from "../types/application";
import type { AppView } from "../types/navigation";

type NavItem = {
  readonly view: AppView;
  readonly label: string;
  readonly icon: string;
};

type PipelineMetric = {
  readonly label: string;
  readonly tone: "active" | "interview" | "offer" | "rejected";
  readonly value: number;
  readonly percentage: number;
};

export const getNavItems = (): readonly NavItem[] => [
  {
    view: "dashboard",
    label: "Dashboard",
    icon: "◧",
  },
  {
    view: "tracker",
    label: "Tracker",
    icon: "▦",
  },
];

export const getPipelineMetrics = (
  metrics: ApplicationMetrics,
): readonly PipelineMetric[] => {
  const total =
    metrics.active + metrics.interview + metrics.offer + metrics.rejected;

  return [
    {
      label: "Active",
      tone: "active",
      value: metrics.active,
      percentage: toPercentage(metrics.active, total),
    },
    {
      label: "Interview",
      tone: "interview",
      value: metrics.interview,
      percentage: toPercentage(metrics.interview, total),
    },
    {
      label: "Offer",
      tone: "offer",
      value: metrics.offer,
      percentage: toPercentage(metrics.offer, total),
    },
    {
      label: "Rejected",
      tone: "rejected",
      value: metrics.rejected,
      percentage: toPercentage(metrics.rejected, total),
    },
  ];
};

const toPercentage = (value: number, total: number): number =>
  total === 0 ? 0 : Math.round((value / total) * 100);
