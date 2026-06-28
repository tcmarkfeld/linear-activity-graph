import type { LinearIssue } from "./linear";

export interface ActivityDay {
  date: Date;
  key: string;
  count: number;
  level: number;
}

export interface ActivityWeek {
  start: Date;
  days: ActivityDay[];
}

export interface MemberActivity {
  userId: string;
  username: string;
  total: number;
  weeks: ActivityWeek[];
}

export interface MonthLabel {
  name: string;
  weekIndex: number;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_COUNT = 7;
const MIN_MONTH_LABEL_SPACING = 4;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function createMemberActivity(issues: LinearIssue[], startDate: Date, endDate: Date): MemberActivity[] {
  const start = startOfWeek(startOfDay(startDate));
  const end = startOfDay(endDate);
  const templateWeeks = createWeeks(start, end);
  const members = new Map<string, { username: string; counts: Map<string, number>; total: number }>();

  for (const issue of issues) {
    if (!issue.assignee || !issue.completedAt) {
      continue;
    }

    const completedDate = startOfDay(new Date(issue.completedAt));

    if (completedDate < start || completedDate > end) {
      continue;
    }

    const userId = issue.assignee.id;
    const username = getHandle(issue.assignee.displayName, issue.assignee.name, issue.assignee.email);
    const member = members.get(userId) ?? { username, counts: new Map<string, number>(), total: 0 };
    const dateKey = toDateKey(completedDate);

    member.counts.set(dateKey, (member.counts.get(dateKey) ?? 0) + 1);
    member.total += 1;
    members.set(userId, member);
  }

  return [...members.entries()]
    .map(([userId, member]) => ({
      userId,
      username: member.username,
      total: member.total,
      weeks: templateWeeks.map((week) => ({
        start: week.start,
        days: week.days.map((day) => {
          const count = member.counts.get(day.key) ?? 0;

          return {
            ...day,
            count,
            level: getActivityLevel(count),
          };
        }),
      })),
    }))
    .sort((left, right) => right.total - left.total || left.username.localeCompare(right.username));
}

export function createMonthLabels(weeks: ActivityWeek[]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastMonth = -1;
  let lastLabelWeekIndex = -MIN_MONTH_LABEL_SPACING;

  weeks.forEach((week, weekIndex) => {
    const month = week.start.getMonth();

    if (month !== lastMonth && weekIndex - lastLabelWeekIndex >= MIN_MONTH_LABEL_SPACING) {
      labels.push({
        name: MONTH_NAMES[month],
        weekIndex,
      });
      lastLabelWeekIndex = weekIndex;
      lastMonth = month;
    }
  });

  return labels;
}

function createWeeks(start: Date, end: Date): ActivityWeek[] {
  const weeks: ActivityWeek[] = [];
  let cursor = start;

  while (cursor <= end) {
    const days = Array.from({ length: WEEKDAY_COUNT }, (_, dayIndex) => {
      const date = addDays(cursor, dayIndex);

      return {
        date,
        key: toDateKey(date),
        count: 0,
        level: 0,
      };
    });

    weeks.push({
      start: cursor,
      days,
    });

    cursor = addDays(cursor, WEEKDAY_COUNT);
  }

  return weeks;
}

function getActivityLevel(count: number): number {
  if (count === 0) {
    return 0;
  }

  if (count === 1) {
    return 1;
  }

  if (count <= 3) {
    return 2;
  }

  if (count <= 5) {
    return 3;
  }

  return 4;
}

function getHandle(displayName: string, name: string, email: string): string {
  const normalized = [name, displayName, email].map(normalizeHandleCandidate).find(Boolean);

  if (normalized) {
    return `@${normalized}`;
  }

  return "@unknown";
}

function normalizeHandleCandidate(value: string): string {
  const localPart = value.trim().replace(/^@+/, "").split("@")[0];

  return localPart
    .replace(/\s+/g, ".")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
