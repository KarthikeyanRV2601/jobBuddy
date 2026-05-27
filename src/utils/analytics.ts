import { type Application, type ApplicationStatus } from "../types/application";
import type {
  ContributionCalendar,
  ContributionCell,
  ContributionWeek,
  DashboardAnalytics,
  FocusMetric,
  SourceBreakdownItem,
} from "../types/analytics";

const ONGOING_STATUSES: readonly ApplicationStatus[] = [
  "Lead",
  "Applied",
  "Assessment",
  "Interview",
] as const;
const SELECTED_STATUSES: readonly ApplicationStatus[] = [
  "Interview",
  "Offer",
] as const;

export const getDashboardAnalytics = (
  applications: readonly Application[],
): DashboardAnalytics => {
  const total = applications.length;
  const rejected = countStatuses(applications, ["Rejected"]);
  const selected = countStatuses(applications, SELECTED_STATUSES);
  const ongoing = countStatuses(applications, ONGOING_STATUSES);

  return {
    total,
    ongoing,
    selected,
    rejected,
    focusMetrics: getFocusMetrics(applications),
  };
};

export const getFocusMetrics = (
  applications: readonly Application[],
): readonly FocusMetric[] => {
  const weekApplications = getApplicationsInCurrentWeek(applications);
  const active = countStatuses(applications, ONGOING_STATUSES);
  const interviews = countStatuses(applications, ["Interview"]);
  const streak = getApplicationStreakDays(applications);

  return [
    {
      label: "This week",
      value: String(weekApplications),
      detail: "applications logged",
      tone: "blue",
    },
    {
      label: "Streak",
      value: `${streak}d`,
      detail: "daily apply rhythm",
      tone: streak > 0 ? "green" : "yellow",
    },
    {
      label: "Live pipeline",
      value: String(active),
      detail: "active opportunities",
      tone: "yellow",
    },
    {
      label: "Interview lane",
      value: String(interviews),
      detail: "prep-worthy threads",
      tone: "green",
    },
  ];
};

export const getLargestSourceCount = (
  sources: readonly SourceBreakdownItem[],
): number => Math.max(1, ...sources.map((source) => source.count));

export const getApplicationContributionCalendar = (
  applications: readonly Application[],
  now = new Date(),
): ContributionCalendar => {
  const endDate = startOfDay(now);
  const firstVisibleDate = new Date(endDate);
  firstVisibleDate.setDate(endDate.getDate() - 364);
  const startDate = new Date(firstVisibleDate);
  startDate.setDate(firstVisibleDate.getDate() - firstVisibleDate.getDay());

  const counts = getApplicationCountsByDate(applications, startDate, endDate);
  const maxValue = Math.max(1, ...counts.values());
  const weeks = getContributionWeeks(startDate, endDate, counts, maxValue);

  return {
    total: [...counts.values()].reduce((total, count) => total + count, 0),
    weeks,
  };
};

const countStatuses = (
  applications: readonly Application[],
  statuses: readonly ApplicationStatus[],
): number =>
  applications.filter((application) => statuses.includes(application.status))
    .length;

const getApplicationsInCurrentWeek = (
  applications: readonly Application[],
): number => {
  const weekStart = getCurrentWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return applications.filter((application) => {
    const createdAt = new Date(application.createdAt);
    return createdAt >= weekStart && createdAt < weekEnd;
  }).length;
};

const getApplicationStreakDays = (
  applications: readonly Application[],
): number => {
  const applicationDates = new Set(
    applications.map((application) =>
      toDateKey(startOfDay(new Date(application.createdAt))),
    ),
  );
  let streak = 0;
  const cursor = startOfDay(new Date());

  while (applicationDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const getCurrentWeekStart = (): Date => {
  const today = startOfDay(new Date());
  today.setDate(today.getDate() - today.getDay());
  return today;
};

const getApplicationCountsByDate = (
  applications: readonly Application[],
  startDate: Date,
  endDate: Date,
): Map<string, number> => {
  const counts = new Map<string, number>();

  applications.forEach((application) => {
    const applicationDate = startOfDay(new Date(application.createdAt));
    if (applicationDate < startDate || applicationDate > endDate) {
      return;
    }

    const key = toDateKey(applicationDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
};

const getContributionWeeks = (
  startDate: Date,
  endDate: Date,
  counts: ReadonlyMap<string, number>,
  maxValue: number,
): readonly ContributionWeek[] => {
  const weeks: ContributionWeek[] = [];
  let cursor = new Date(startDate);
  let previousMonth = -1;

  while (cursor <= endDate) {
    const weekCells: ContributionCell[] = [];
    let monthLabel = "";

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(cursor);
      const dateKey = toDateKey(date);
      const count = counts.get(dateKey) ?? 0;

      if (
        date <= endDate &&
        date.getDate() <= 7 &&
        date.getMonth() !== previousMonth
      ) {
        monthLabel = formatMonthLabel(date);
        previousMonth = date.getMonth();
      }

      weekCells.push({
        count,
        dateKey,
        dateLabel: formatContributionDate(date),
        intensity: getHeatmapIntensity(count, maxValue),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({
      cells: weekCells,
      monthLabel,
    });
  }

  return weeks;
};

const startOfDay = (date: Date): Date => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const formatMonthLabel = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);

const formatContributionDate = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

const getHeatmapIntensity = (
  value: number,
  maxValue: number,
): 0 | 1 | 2 | 3 | 4 => {
  if (value === 0) {
    return 0;
  }

  const ratio = value / maxValue;
  if (ratio <= 0.25) {
    return 1;
  }

  if (ratio <= 0.5) {
    return 2;
  }

  if (ratio <= 0.75) {
    return 3;
  }

  return 4;
};
