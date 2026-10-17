// Formatting uses Intl so every time renders in the device's own timezone and locale.

const dayMonth = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const monthShort = new Intl.DateTimeFormat(undefined, { month: "short" });

export const formatDayMonth = (d: Date) => dayMonth.format(d);
export const formatWeekday = (d: Date) => weekday.format(d);
export const formatTime = (d: Date) => clock.format(d);
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

export const pad2 = (n: number) => String(n).padStart(2, "0");
