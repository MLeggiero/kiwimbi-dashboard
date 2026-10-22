import { describe, expect, it } from 'vitest';
import { countWeekdays, dayToIso, fmtRange, isoToDay, parseDateCell, shiftYears, startOfWeek, weekdayIndex } from '../shared/dates';

describe('dates', () => {
  it('round-trips ISO dates, including before 1970 and leap days', () => {
    for (const iso of ['1970-01-01', '1969-12-31', '2024-02-29', '2026-09-23']) expect(dayToIso(isoToDay(iso))).toBe(iso);
  });

  it('knows the day of the week (Monday = 0)', () => {
    expect(weekdayIndex(isoToDay('2026-09-21'))).toBe(0);
    expect(weekdayIndex(isoToDay('2026-09-27'))).toBe(6);
    expect(weekdayIndex(isoToDay('1969-12-31'))).toBe(2);
    expect(dayToIso(startOfWeek(isoToDay('2026-01-01')))).toBe('2025-12-29');
  });

  it('reads date cells from the server and typed M/D/YYYY text', () => {
    expect(parseDateCell('2026-03-30T00:00:00')).toBe('2026-03-30');
    expect(parseDateCell('2026-03-30')).toBe('2026-03-30');
    expect(parseDateCell(' 3/30/2026 ')).toBe('2026-03-30');
    expect(parseDateCell('2026-02-30')).toBeNull();
    expect(parseDateCell('next Tuesday')).toBeNull();
    expect(parseDateCell(null)).toBeNull();
  });

  it('reads spreadsheet serial numbers, which is how the Sheets API returns dates', () => {
    expect(parseDateCell(45658)).toBe('2025-01-01');
    expect(parseDateCell(45658.75)).toBe('2025-01-01');
    expect(parseDateCell(isoToDay('2026-03-30') + 25569)).toBe('2026-03-30');
    expect(parseDateCell(0)).toBeNull();
    expect(parseDateCell(-3)).toBeNull();
    expect(parseDateCell(Number.NaN)).toBeNull();
  });

  it('shifts by a year without inventing Feb 29', () => {
    expect(dayToIso(shiftYears(isoToDay('2024-02-29'), -1))).toBe('2023-02-28');
    expect(dayToIso(shiftYears(isoToDay('2026-09-23'), -1))).toBe('2025-09-23');
  });

  it('counts school days and formats ranges', () => {
    expect(countWeekdays(isoToDay('2026-09-21'), isoToDay('2026-09-27'))).toBe(5);
    expect(fmtRange(isoToDay('2026-01-05'), isoToDay('2026-01-11'))).toBe('Jan 5 – 11, 2026');
    expect(fmtRange(isoToDay('2025-12-29'), isoToDay('2026-01-04'))).toBe('Dec 29, 2025 – Jan 4, 2026');
  });
});
