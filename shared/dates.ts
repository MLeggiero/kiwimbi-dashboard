import type { ISODate } from './types';

// Dates are handled as whole "day numbers" (days since 1970-01-01, UTC) so that
// arithmetic never trips over time zones or daylight saving.

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;
const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

export function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function ymdToDay(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function isoToDay(iso: ISODate): number {
  const m = ISO_RE.exec(iso);
  return m ? ymdToDay(+m[1], +m[2], +m[3]) : NaN;
}

export function dayToIso(day: number): ISODate {
  const d = new Date(day * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function dayParts(day: number): { y: number; m: number; d: number } {
  const dt = new Date(day * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** Spreadsheet serial day of 1970-01-01 (serial 0 is 1899-12-30). */
const SERIAL_EPOCH = 25569;

/**
 * Read a date cell. Accepts spreadsheet serial numbers (how the Sheets API returns date
 * and date-time cells, in the sheet's own time zone; the fraction is the time of day),
 * ISO text ('YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss'), and typed 'M/D/YYYY' text, as the form asks.
 */
export function parseDateCell(value: unknown): ISODate | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 1 && value < 2958466 ? dayToIso(Math.floor(value) - SERIAL_EPOCH) : null;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  let m = ISO_RE.exec(s);
  if (m && isValidYMD(+m[1], +m[2], +m[3])) return `${m[1]}-${m[2]}-${m[3]}`;
  m = MDY_RE.exec(s);
  if (m && isValidYMD(+m[3], +m[1], +m[2])) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  return null;
}

/** Monday = 0 … Sunday = 6. (Day 0, 1970-01-01, was a Thursday.) */
export function weekdayIndex(day: number): number {
  return (((day % 7) + 7) % 7 + 3) % 7;
}

export const isWeekday = (day: number) => weekdayIndex(day) < 5;
export const startOfWeek = (day: number) => day - weekdayIndex(day);

export function startOfMonth(day: number): number {
  const { y, m } = dayParts(day);
  return ymdToDay(y, m, 1);
}

export function startOfNextMonth(day: number): number {
  const { y, m } = dayParts(day);
  return m === 12 ? ymdToDay(y + 1, 1, 1) : ymdToDay(y, m + 1, 1);
}

export function startOfYear(day: number): number {
  return ymdToDay(dayParts(day).y, 1, 1);
}

/** Same calendar date `years` away (Feb 29 falls back to Feb 28). */
export function shiftYears(day: number, years: number): number {
  const { y, m, d } = dayParts(day);
  const ty = y + years;
  return ymdToDay(ty, m, Math.min(d, new Date(Date.UTC(ty, m, 0)).getUTCDate()));
}

/** Same day of the month `months` away (the 31st falls back to the month's last day). */
export function shiftMonths(day: number, months: number): number {
  const { y, m, d } = dayParts(day);
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  return ymdToDay(ty, tm, Math.min(d, new Date(Date.UTC(ty, tm, 0)).getUTCDate()));
}

export function countWeekdays(from: number, to: number): number {
  let n = 0;
  for (let d = from; d <= to; d++) if (isWeekday(d)) n++;
  return n;
}

export const monthName = (m: number) => MONTHS[m - 1];

/** 'Sep 23' */
export function fmtDayShort(day: number): string {
  const { m, d } = dayParts(day);
  return `${MONTHS[m - 1]} ${d}`;
}

/** 'Sep 23, 2026' */
export function fmtDay(day: number): string {
  const { y, m, d } = dayParts(day);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** 'Jan 5 – 11, 2026' / 'Dec 29, 2025 – Jan 4, 2026' */
export function fmtRange(from: number, to: number): string {
  if (from === to) return fmtDay(from);
  const a = dayParts(from);
  const b = dayParts(to);
  if (a.y !== b.y) return `${fmtDay(from)} – ${fmtDay(to)}`;
  if (a.m === b.m) return `${MONTHS[a.m - 1]} ${a.d} – ${b.d}, ${b.y}`;
  return `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
}
