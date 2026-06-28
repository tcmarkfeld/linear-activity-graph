import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, RefreshCcw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { createMemberActivity, createMonthLabels, WEEKDAY_LABELS } from "./activity";
import type { MemberActivity } from "./activity";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Calendar } from "./components/ui/calendar";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { SegmentedControl } from "./components/ui/segmented-control";
import { DATE_PRESETS, getDefaultDateRange, getPresetDateRange, normalizeDateRange, toEndOfDay } from "./dateRange";
import type { DatePreset, DateRangeValue } from "./dateRange";
import { fetchCompletedIssues } from "./linear";
import { cn } from "./lib/utils";

const DEFAULT_COLUMNS = 2;
const DEFAULT_DENSITY: Density = "compact";
const TOOLTIP_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type ColumnCount = 1 | 2 | 3;
type Density = "compact" | "comfortable";

export function App() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => getDefaultDateRange());
  const [columns, setColumns] = useState<ColumnCount>(DEFAULT_COLUMNS);
  const [density, setDensity] = useState<Density>(DEFAULT_DENSITY);
  const normalizedDateRange = normalizeDateRange(dateRange);
  const activityQuery = useQuery({
    queryKey: ["linear-activity", normalizedDateRange.start.toISOString(), normalizedDateRange.end.toISOString()],
    queryFn: () => loadMemberActivity(normalizedDateRange),
    enabled: true,
    retry: false,
  });

  const errorMessage = activityQuery.error instanceof Error ? activityQuery.error.message : "Unknown Linear API error.";
  const members = activityQuery.data ?? [];
  const totalTickets = members.reduce((total, member) => total + member.total, 0);

  function updateColumns(nextColumns: ColumnCount) {
    if (nextColumns === columns) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setColumns(nextColumns);
      return;
    }

    if (!document.startViewTransition) {
      setColumns(nextColumns);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setColumns(nextColumns);
      });
    });

    void transition.finished.then(scrollGraphsToLatest);
  }

  return (
    <main className="page-shell">
      <header className="app-header">
        <div>
          <h1>Linear activity</h1>
          <p>Completed Linear tickets by assignee for selected date range.</p>
        </div>
        <Button disabled={activityQuery.isFetching} onClick={() => void activityQuery.refetch()}>
          <RefreshCcw size={16} />
          {activityQuery.isFetching ? "Refreshing" : "Refresh"}
        </Button>
      </header>

      <section className="dashboard-toolbar">
        <div className="summary-strip">
          <Metric label="Tickets" value={totalTickets.toLocaleString()} />
          <Metric label="Members" value={members.length.toLocaleString()} />
        </div>
        <div className="toolbar-controls">
          <SegmentedControl<ColumnCount>
            label="Columns"
            onChange={updateColumns}
            options={[
              { label: "1", value: 1 },
              { label: "2", value: 2 },
              { label: "3", value: 3 },
            ]}
            value={columns}
          />
          <SegmentedControl<Density>
            label="Density"
            onChange={setDensity}
            options={[
              { label: "Compact", value: "compact" },
              { label: "Comfort", value: "comfortable" },
            ]}
            value={density}
          />
          <DateRangePicker dateRange={normalizedDateRange} onChange={setDateRange} />
        </div>
      </section>

      {activityQuery.isLoading && <LoadingGrid columns={columns} />}
      {activityQuery.isError && <ErrorState message={errorMessage} />}
      {activityQuery.isSuccess && <ActivityList columns={columns} density={density} members={members} />}
    </main>
  );
}

async function loadMemberActivity(dateRange: DateRangeValue): Promise<MemberActivity[]> {
  const issues = await fetchCompletedIssues(dateRange.start, toEndOfDay(dateRange.end));

  return createMemberActivity(issues, dateRange.start, dateRange.end);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="notice error">
      <strong>Error</strong>
      <span>{message}</span>
    </section>
  );
}

function DateRangePicker({
  dateRange,
  onChange,
}: {
  dateRange: DateRangeValue;
  onChange: (dateRange: DateRangeValue) => void;
}) {
  const selected: DateRange = {
    from: dateRange.start,
    to: dateRange.end,
  };

  function handleSelect(nextRange: DateRange | undefined) {
    if (!nextRange?.from) {
      return;
    }

    onChange(
      normalizeDateRange({
        start: nextRange.from,
        end: nextRange.to ?? nextRange.from,
      }),
    );
  }

  function applyPreset(preset: DatePreset) {
    onChange(getPresetDateRange(preset));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="date-range-trigger" type="button" variant="outline">
          <CalendarIcon size={16} />
          <span>{formatDateRangeLabel(dateRange)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="date-popover">
        <div className="date-picker-layout">
          <div className="preset-list" aria-label="Date presets">
            {DATE_PRESETS.map((preset) => (
              <Button key={preset.value} onClick={() => applyPreset(preset.value)} size="sm" type="button" variant="ghost">
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            numberOfMonths={2}
            onSelect={handleSelect}
            selected={selected}
            showOutsideDays
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LoadingGrid({ columns }: { columns: ColumnCount }) {
  return (
    <section className={`activity-list columns-${columns}`}>
      {Array.from({ length: 4 }, (_, index) => (
        <Card className="activity-card skeleton-card" key={index}>
          <CardHeader>
            <div className="skeleton-line wide" />
            <div className="skeleton-line narrow" />
          </CardHeader>
          <CardContent>
            <div className="skeleton-graph" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function ActivityList({
  columns,
  density,
  members,
}: {
  columns: ColumnCount;
  density: Density;
  members: MemberActivity[];
}) {
  if (members.length === 0) {
    return <section className="notice">No completed assigned tickets found for selected range.</section>;
  }

  return (
    <section className={`activity-list columns-${columns}`}>
      {members.map((member) => (
        <ActivityCard columns={columns} density={density} key={member.userId} member={member} />
      ))}
    </section>
  );
}

function ActivityCard({ columns, density, member }: { columns: ColumnCount; density: Density; member: MemberActivity }) {
  const monthLabels = useMemo(() => createMonthLabels(member.weeks), [member.weeks]);
  const graphScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const graphScroll = graphScrollRef.current;

    if (graphScroll) {
      graphScroll.scrollLeft = graphScroll.scrollWidth;
      requestAnimationFrame(() => {
        graphScroll.scrollLeft = graphScroll.scrollWidth;
      });
    }
  }, [columns, density, member.weeks]);

  const cardStyle = {
    "--week-count": member.weeks.length,
    viewTransitionName: getCardTransitionName(member.userId),
  } as CSSProperties;

  return (
    <Card className={cn("activity-card", `density-${density}`)} style={cardStyle}>
      <CardHeader>
        <div>
          <h2>{member.username}</h2>
          <p>{member.total.toLocaleString()} tickets completed in selected range</p>
        </div>
        <Badge>{member.total.toLocaleString()}</Badge>
      </CardHeader>

      <CardContent>
        <div className="graph-frame" aria-label={`${member.username} completed ticket activity`}>
          <div className="weekday-labels">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="graph-main">
            <div className="graph-scroll" ref={graphScrollRef}>
              <div className="month-row">
                {monthLabels.map((label) => (
                  <span key={`${label.name}-${label.weekIndex}`} style={{ gridColumnStart: label.weekIndex + 1 }}>
                    {label.name}
                  </span>
                ))}
              </div>

              <div className="graph-body">
                <div className="activity-grid">
                  {member.weeks.map((week) => (
                    <div className="week-column" key={week.start.toISOString()}>
                      {week.days.map((day) => (
                        <span
                          className={`activity-cell level-${day.level}`}
                          key={day.key}
                          title={`${day.count} completed ${day.count === 1 ? "ticket" : "tickets"} on ${formatTooltipDate(day.date)}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="legend">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <span className={`activity-cell level-${level}`} key={level} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTooltipDate(date: Date): string {
  return TOOLTIP_DATE_FORMATTER.format(date);
}

function formatDateRangeLabel(dateRange: DateRangeValue): string {
  return `${formatDateInputLabel(dateRange.start)} - ${formatDateInputLabel(dateRange.end)}`;
}

function formatDateInputLabel(date: Date): string {
  return TOOLTIP_DATE_FORMATTER.format(date);
}

function scrollGraphsToLatest() {
  document.querySelectorAll<HTMLDivElement>(".graph-scroll").forEach((graphScroll) => {
    graphScroll.scrollLeft = graphScroll.scrollWidth;
  });
}

function getCardTransitionName(userId: string): string {
  const normalizedId = userId.replace(/[^a-zA-Z0-9_-]/g, "-");

  return `activity-card-${normalizedId}`;
}
