import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyLogs, toggleScheduleItem, type DayLogRow } from "@/lib/tracker.functions";
import { MEAL_ROTATION, SCHEDULE, TOTAL_ITEMS, localDateString } from "@/lib/schedule";
import portalHero from "@/assets/portal-hero.png";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dimension-Locked — Daily Schedule Streak Tracker" },
      {
        name: "description",
        content:
          "Punch through today's portal: check off every item on your daily schedule to lock the dimension and grow your streak.",
      },
      { property: "og:title", content: "Dimension-Locked — Daily Schedule Streak Tracker" },
      {
        property: "og:description",
        content:
          "Punch through today's portal: check off every item on your daily schedule to lock the dimension and grow your streak.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type LogsMap = Record<string, string[]>;

function toMap(rows: DayLogRow[]): LogsMap {
  const map: LogsMap = {};
  for (const row of rows) map[row.log_date] = row.completed_items;
  return map;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDateString(d);
}

function isLocked(map: LogsMap, date: string): boolean {
  return (map[date]?.length ?? 0) >= TOTAL_ITEMS;
}

function computeStats(map: LogsMap, today: string) {
  // Current streak: consecutive locked days ending today (or yesterday if today is still open).
  let cursor = isLocked(map, today) ? today : addDays(today, -1);
  let current = 0;
  while (isLocked(map, cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // Longest streak + total over all time.
  const lockedDates = Object.keys(map)
    .filter((d) => isLocked(map, d))
    .sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of lockedDates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const total = lockedDates.length;
  const firstLog = Object.keys(map).sort()[0];
  const daysSinceStart = firstLog
    ? Math.max(1, Math.round((new Date(today + "T12:00:00").getTime() - new Date(firstLog + "T12:00:00").getTime()) / 86400000) + 1)
    : 0;
  const successRate = daysSinceStart > 0 ? Math.round((total / daysSinceStart) * 100) : 0;

  return { current, longest, total, successRate };
}

function buildHeatmap(map: LogsMap, today: string) {
  // 6 weeks ending on the current week; weeks start Monday.
  const todayD = new Date(today + "T12:00:00");
  const dow = (todayD.getDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -dow - 5 * 7);
  const weeks: { date: string; locked: boolean; logged: boolean; future: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const future = date > today;
      const logged = (map[date]?.length ?? 0) > 0;
      week.push({ date, locked: !future && isLocked(map, date), logged, future });
    }
    weeks.push(week);
  }
  return weeks;
}

function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fetchLogs = useServerFn(getMyLogs);
  const toggle = useServerFn(toggleScheduleItem);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["day-logs"],
    queryFn: () => fetchLogs(),
  });

  const today = localDateString();
  const map = toMap(rows);
  const todaySet = new Set(map[today] ?? []);
  const doneCount = todaySet.size;
  const dayLocked = doneCount >= TOTAL_ITEMS;
  const progress = Math.round((doneCount / TOTAL_ITEMS) * 100);
  const stats = computeStats(map, today);
  const heatmap = buildHeatmap(map, today);

  const handleToggle = async (itemId: string) => {
    const done = !todaySet.has(itemId);
    // Optimistic update
    queryClient.setQueryData<DayLogRow[]>(["day-logs"], (old = []) => {
      const existing = old.find((r) => r.log_date === today);
      if (existing) {
        return old.map((r) =>
          r.log_date === today
            ? {
                ...r,
                completed_items: done
                  ? [...new Set([...r.completed_items, itemId])]
                  : r.completed_items.filter((i) => i !== itemId),
              }
            : r,
        );
      }
      return [...old, { log_date: today, completed_items: [itemId] }];
    });
    try {
      await toggle({ data: { date: today, itemId, done } });
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["day-logs"] });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await router.invalidate();
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      {/* Nebula glows */}
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
      {/* Floating portal decoration */}
      <div className="pointer-events-none fixed -bottom-24 -left-24 size-64 rounded-full border-[20px] border-primary opacity-10 blur-2xl animate-pulse" />

      {/* Main device container */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border-4 border-border bg-card p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:p-8">
        {/* Portal illustration */}
        <img
          src={portalHero}
          alt="A hand-drawn cartoon portal swirling with green energy"
          width={1024}
          height={1024}
          className="pointer-events-none absolute -right-16 -top-16 w-56 animate-portal-pulse opacity-90 sm:w-72"
        />

        {/* Header */}
        <div className="relative mb-8 flex flex-wrap items-end justify-between gap-4 border-b-4 border-primary pb-4">
          <div>
            <h1 className="font-display text-5xl uppercase tracking-wider text-primary portal-text-glow sm:text-6xl">
              Dimension-Locked
            </h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground sm:text-sm">
              Streak Protocol // Sector C-137 · {todayLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="inline-block rounded-t-lg bg-primary px-4 py-1 text-xs font-bold uppercase text-primary-foreground">
                Status
              </div>
              <div className="border-2 border-primary bg-secondary px-6 py-2 portal-glow">
                <span
                  className={`font-mono text-xl ${dayLocked ? "text-neon" : "animate-pulse text-foreground"}`}
                >
                  {dayLocked ? "LOCKED" : "UNLOCKED"}
                </span>
              </div>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg border-2 border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              Exit rift
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-12 gap-6 sm:gap-8">
          {/* Left column: stats + heatmap + meals */}
          <div className="col-span-12 space-y-6 lg:col-span-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden rounded-xl border-2 border-border bg-secondary p-4">
                <div className="absolute right-0 top-0 bg-rift px-2 py-1 text-[10px] font-bold text-primary-foreground">
                  STREAK
                </div>
                <p className="pt-2 font-display text-4xl text-foreground">{stats.current}</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">Days straight</p>
              </div>
              <div className="rounded-xl border-2 border-border bg-secondary p-4">
                <p className="pt-2 font-display text-4xl text-rift">{stats.longest}</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">Personal best</p>
              </div>
            </div>

            {/* Heatmap */}
            <div className="relative rounded-2xl border-2 border-border bg-background p-6">
              <h3 className="mb-4 font-display text-xl uppercase text-primary">Timeline Stability</h3>
              <div className="grid grid-cols-7 gap-2">
                {heatmap.map((week, wi) =>
                  week.map((cell) => (
                    <div
                      key={`${wi}-${cell.date}`}
                      title={cell.date}
                      className={`aspect-square w-full rounded-sm ${
                        cell.future
                          ? "bg-transparent"
                          : cell.locked
                            ? "bg-primary portal-glow"
                            : cell.logged
                              ? "bg-primary/40"
                              : "bg-secondary"
                      } ${cell.date === today ? "animate-pulse ring-2 ring-primary" : ""}`}
                    />
                  )),
                )}
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Total days: {stats.total}</span>
                <span className="text-primary">{stats.successRate}% success</span>
              </div>
            </div>

            {/* Meal rotation reference */}
            <div className="space-y-2 rounded-xl border-2 border-rift/30 bg-rift/10 p-4">
              <h4 className="text-sm font-bold uppercase italic tracking-tighter text-rift">
                Bio-Fuel Schematic
              </h4>
              <div className="space-y-1 font-mono text-[10px]">
                {(Object.entries(MEAL_ROTATION) as [string, string[]][]).map(([k, v]) => (
                  <p key={k} className="text-muted-foreground">
                    <span className="text-rift">{k}:</span> {v.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: schedule checklist */}
          <div className="col-span-12 space-y-3 lg:col-span-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-display text-2xl uppercase text-primary">
                Daily Objective Sequence
              </h3>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {doneCount}/{TOTAL_ITEMS}
                </span>
                <div className="h-2 w-24 overflow-hidden rounded-full border border-border bg-background">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <p className="animate-pulse px-2 font-mono text-sm text-muted-foreground">
                Calibrating portal…
              </p>
            ) : (
              <div className="space-y-2">
                {SCHEDULE.map((item) => {
                  const done = todaySet.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className={`group flex w-full items-center justify-between border-l-4 p-4 text-left transition-all ${
                        done
                          ? "border-neon bg-secondary/60 hover:bg-secondary"
                          : "border-border bg-secondary/40 hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex size-6 items-center justify-center border-2 ${
                            done ? "border-neon bg-neon/20" : "border-muted-foreground/40"
                          }`}
                        >
                          {done && <div className="size-3 bg-neon portal-glow" />}
                        </div>
                        <div>
                          <span className="block font-mono text-xs text-muted-foreground">
                            {item.time}
                          </span>
                          <span
                            className={`font-bold uppercase tracking-tight ${
                              done ? "text-foreground" : "text-foreground/80"
                            }`}
                          >
                            {item.label}{" "}
                            {item.sub && (
                              <span className="text-xs font-normal normal-case italic text-muted-foreground">
                                ({item.sub})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          done ? "text-neon" : "text-muted-foreground/50"
                        }`}
                      >
                        {done ? "COMPLETE" : "PENDING"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="px-2 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {dayLocked
                ? "Portal sealed. See you tomorrow, same dimension."
                : "Check every objective to lock today's dimension."}
            </p>
          </div>
        </div>

        {/* Bottom decorative circuitry */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        <div className="absolute bottom-2 right-8 flex gap-2">
          <div className="size-2 animate-ping rounded-full bg-destructive" />
          <div className="size-2 rounded-full bg-border" />
          <div className="size-2 rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}
