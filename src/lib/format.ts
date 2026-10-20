// Formatting uses Intl so every time renders in the device's own timezone and locale.

const dayMonth = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const clocks = {
  system: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }),
  "12h": new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hourCycle: "h12" }),
  "24h": new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
};
const monthShort = new Intl.DateTimeFormat(undefined, { month: "short" });

export const formatDayMonth = (d: Date) => dayMonth.format(d);
export const formatWeekday = (d: Date) => weekday.format(d);
/** Session clock time in the device timezone, honouring the user's 12/24-hour preference. */
export const formatTime = (d: Date, clock: keyof typeof clocks = "system") => clocks[clock].format(d);
export const formatMonth = (d: Date) => monthShort.format(d).toUpperCase();

export function formatDateRange(start: Date, end: Date) {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${monthShort.format(end)}`;
  }
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

export const timeZoneName = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function relativeDay(d: Date, now = new Date()) {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatWeekday(d);
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function splitCountdown(ms: number): Countdown {
  const clamped = Math.max(0, ms);
  const s = Math.floor(clamped / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: clamped === 0,
  };
}

/** "5m ago", "3h ago", "2d ago" – compact age for news items. */
export function timeAgo(d: Date, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
