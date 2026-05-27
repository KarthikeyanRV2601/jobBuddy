import type { ApplicationStatus } from "./application";

export type RatioMetric = {
  readonly label: string;
  readonly value: number;
  readonly total: number;
  readonly percentage: number;
};

export type FocusMetricTone = "blue" | "green" | "yellow" | "red";

export type FocusMetric = {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone: FocusMetricTone;
};

export type StatusDistributionItem = {
  readonly status: ApplicationStatus;
  readonly count: number;
  readonly percentage: number;
};

export type TimelinePoint = {
  readonly label: string;
  readonly applied: number;
  readonly rejected: number;
  readonly selected: number;
};

export type TimelineLinePoint = {
  readonly label: string;
  readonly total: number;
  readonly x: number;
  readonly y: number;
};

export type TimelineLineChart = {
  readonly path: string;
  readonly points: readonly TimelineLinePoint[];
  readonly maxValue: number;
};

export type TimelineHeatmapStatus = "Applied" | "Selected" | "Rejected";

export type TimelineHeatmapCell = {
  readonly id: string;
  readonly label: string;
  readonly status: TimelineHeatmapStatus;
  readonly value: number;
  readonly intensity: 0 | 1 | 2 | 3 | 4;
};

export type TimelineHeatmapRow = {
  readonly status: TimelineHeatmapStatus;
  readonly cells: readonly TimelineHeatmapCell[];
};

export type TimelineHeatmap = {
  readonly labels: readonly string[];
  readonly maxValue: number;
  readonly rows: readonly TimelineHeatmapRow[];
};

export type ContributionCell = {
  readonly count: number;
  readonly dateLabel: string;
  readonly dateKey: string;
  readonly intensity: 0 | 1 | 2 | 3 | 4;
};

export type ContributionWeek = {
  readonly cells: readonly ContributionCell[];
  readonly monthLabel: string;
};

export type ContributionCalendar = {
  readonly total: number;
  readonly weeks: readonly ContributionWeek[];
};

export type SourceBreakdownItem = {
  readonly source: string;
  readonly count: number;
};

export type DashboardAnalytics = {
  readonly focusMetrics: readonly FocusMetric[];
  readonly total: number;
  readonly ongoing: number;
  readonly selected: number;
  readonly rejected: number;
};
