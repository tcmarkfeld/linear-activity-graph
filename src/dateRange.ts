export interface DateRangeValue {
  start: Date;
  end: Date;
}

export type DatePreset = "last-30-days" | "past-year" | "last-month" | "this-month" | "last-quarter" | "last-year";

export interface DatePresetOption {
  label: string;
  value: DatePreset;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DATE_PRESETS: DatePresetOption[] = [
  { label: "Last 30 days", value: "last-30-days" },
  { label: "Past year", value: "past-year" },
  { label: "Last month", value: "last-month" },
  { label: "This month", value: "this-month" },
  { label: "Last quarter", value: "last-quarter" },
  { label: "Last year", value: "last-year" },
];

export function getDefaultDateRange(today = new Date()): DateRangeValue {
  return getPresetDateRange("past-year", today);
}

export function getPresetDateRange(preset: DatePreset, today = new Date()): DateRangeValue {
  const current = startOfDay(today);

  switch (preset) {
    case "last-30-days":
      return {
        start: addDays(current, -29),
        end: current,
      };
    case "past-year":
      return {
        start: addDays(current, -364),
        end: current,
      };
    case "last-month": {
      const firstDayThisMonth = new Date(current.getFullYear(), current.getMonth(), 1);
      const lastDayLastMonth = addDays(firstDayThisMonth, -1);

      return {
        start: new Date(lastDayLastMonth.getFullYear(), lastDayLastMonth.getMonth(), 1),
        end: lastDayLastMonth,
      };
    }
    case "this-month":
      return {
        start: new Date(current.getFullYear(), current.getMonth(), 1),
        end: current,
      };
    case "last-quarter": {
      const currentQuarter = Math.floor(current.getMonth() / 3);
      const lastQuarterStartMonth = currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3;
      const year = currentQuarter === 0 ? current.getFullYear() - 1 : current.getFullYear();
      const start = new Date(year, lastQuarterStartMonth, 1);
      const end = addDays(new Date(year, lastQuarterStartMonth + 3, 1), -1);

      return { start, end };
    }
    case "last-year":
      return {
        start: new Date(current.getFullYear() - 1, 0, 1),
        end: new Date(current.getFullYear() - 1, 11, 31),
      };
  }
}

export function normalizeDateRange(range: DateRangeValue): DateRangeValue {
  if (range.start <= range.end) {
    return {
      start: startOfDay(range.start),
      end: startOfDay(range.end),
    };
  }

  return {
    start: startOfDay(range.end),
    end: startOfDay(range.start),
  };
}

export function toEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}
