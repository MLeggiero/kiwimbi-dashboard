import { COLUMN_SPECS, HEADER_NAME, HEADER_TIMESTAMP, IGNORED_HEADERS, normHeader } from './headers';
import { METRIC_BY_ID, PROGRAM_IDS } from './metrics';
import { dayToIso, isoToDay, parseDateCell, weekdayIndex } from './dates';
import { buildNameMap, canonicalName, isTestName } from './names';
import type { CleanResult, Fact, ISODate, Issue, IssueType, MetricId, Submission, Target, Term } from './types';

export type Cell = string | number | boolean | null | undefined;

/** The sheet's contents, with date cells already converted to ISO strings by the server. */
export interface SheetExport {
  header: Cell[];
  rows: Cell[][];
  nameMapRows?: Cell[][];
  termsRows?: Cell[][];
  targetsRows?: Cell[][];
  sheetUrl?: string | null;
}

export interface PipelineOptions {
  today: ISODate;
  timezone: string;
  generatedAt: string;
  /** Maps a canonical reporter name to a stable pseudonymous id. */
  hashName: (canonicalName: string) => string;
  /** Sheet row number of rows[0]. Default 2 (row 1 is the header). */
  firstDataRow?: number;
  /** Reports starting before this date are treated as typos. Default 2024-01-01. */
  minDate?: ISODate;
  /** Reports may end at most this many days after today. Default 7. */
  maxFutureDays?: number;
  /** Spans longer than this are kept but flagged. Default 92. */
  longSpanDays?: number;
  /**
   * Start of the reporting period the dashboard covers (the Script Property DATA_START).
   * Reports that end before it are left out; a report that runs across it keeps only the
   * share for the days on or after it. Rows from before it drop out of the checks too.
   */
  dataStart?: ISODate;
}

const isBlank = (c: Cell) => c === null || c === undefined || (typeof c === 'string' && c.trim() === '');

/**
 * Strict count parser: numbers pass through; text is accepted only when it is plainly a
 * number ("1,500", "12", "7.5"). Anything else ("20-25", "about 40") is rejected rather
 * than digit-stripped.
 */
export function parseCount(raw: Cell): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

/**
 * Finds a column by its header. Google Forms can give several columns the same title
 * ("Starting Date"); downloads and tables number the repeats ("Starting Date 2"), the live
 * sheet doesn't. So when "Name N" isn't found as written, use the Nth column titled "Name".
 */
export function findColumn(headerNorm: string[], wanted: string): number {
  const key = normHeader(wanted);
  const exact = headerNorm.indexOf(key);
  if (exact >= 0) return exact;
  const m = /^(.*\S) (\d+)$/.exec(key);
  if (!m) return -1;
  let seen = 0;
  for (let i = 0; i < headerNorm.length; i++) if (headerNorm[i] === m[1] && ++seen === Number(m[2])) return i;
  return -1;
}

export function runPipeline(sheet: SheetExport, opts: PipelineOptions): CleanResult {
  const issues: Issue[] = [];
  const headerNorm = sheet.header.map(normHeader);
  const col = (h: string) => findColumn(headerNorm, h);
  const tsIdx = col(HEADER_TIMESTAMP);
  const nameIdx = col(HEADER_NAME);

  const specs = COLUMN_SPECS.map((spec) => ({ spec, def: METRIC_BY_ID[spec.metric], v: col(spec.value), s: col(spec.start), e: col(spec.end) }));
  for (const x of specs) {
    if (x.v < 0) issues.push({ row: null, type: 'missing_column', metric: x.spec.metric, excluded: false, detail: `Column "${x.spec.value}" wasn't found, so ${x.def.label.toLowerCase()} can't be shown.` });
    else if (x.s < 0 || x.e < 0) {
      const missing = [x.s < 0 ? x.spec.start : null, x.e < 0 ? x.spec.end : null].filter(Boolean).map((h) => `"${String(h).replace(/\s+/g, ' ')}"`);
      issues.push({ row: null, type: 'missing_column', metric: x.spec.metric, excluded: false, detail: `Date column ${missing.join(' and ')} for "${x.spec.value}" wasn't found.` });
    }
  }

  const known = new Set([...IGNORED_HEADERS, ...COLUMN_SPECS.flatMap((s) => [s.value, s.start, s.end])].map(normHeader));
  const unmappedColumns: string[] = [];
  sheet.header.forEach((h, i) => {
    const label = String(h ?? '').trim();
    if (label && !known.has(headerNorm[i])) unmappedColumns.push(label);
  });
  for (const h of unmappedColumns) issues.push({ row: null, type: 'unmapped_column', excluded: false, detail: `Column "${h}" isn't used by the dashboard.` });

  const nameMap = buildNameMap(sheet.nameMapRows ?? []);
  const minDay = isoToDay(opts.minDate ?? '2024-01-01');
  const maxDay = isoToDay(opts.today) + (opts.maxFutureDays ?? 7);
  const longSpan = opts.longSpanDays ?? 92;
  const firstRow = opts.firstDataRow ?? 2;

  let facts: (Fact & { row: number })[] = [];
  const reporters: Record<string, string> = {};
  let submissions: Submission[] = [];
  const rowSubmitted = new Map<number, ISODate | null>();
  const seen = new Set<string>();
  let latest = -Infinity;
  let rowCount = 0;

  sheet.rows.forEach((row, i) => {
    if (!row || row.every(isBlank)) return;
    rowCount++;
    const rowNum = firstRow + i;
    const submitted = tsIdx >= 0 ? parseDateCell(row[tsIdx]) : null;
    rowSubmitted.set(rowNum, submitted);
    const name = nameIdx >= 0 ? canonicalName(row[nameIdx], nameMap) : '';
    if (name && isTestName(name)) {
      issues.push({ row: rowNum, type: 'test_row', excluded: true, detail: 'Test submission, ignored.' });
      return;
    }
    const reporter = name ? opts.hashName(name) : undefined;
    if (reporter) reporters[reporter] = name;
    if (submitted) latest = Math.max(latest, isoToDay(submitted));

    const rowMetrics: MetricId[] = [];
    let rowStart: ISODate | null = null;
    let rowEnd: ISODate | null = null;
    const dated = specs.map((x) => ({ x, start: x.s >= 0 ? parseDateCell(row[x.s]) : null, end: x.e >= 0 ? parseDateCell(row[x.e]) : null }));
    const complete = dated.filter((d) => d.start && d.end);

    for (const { x, start: givenStart, end: givenEnd } of dated) {
      if (x.v < 0 || isBlank(row[x.v])) continue;
      const metric = x.spec.metric;
      const flag = (type: IssueType, excluded: boolean, detail: string) =>
        issues.push({ row: rowNum, type, metric, excluded, detail, ...(reporter ? { reporter } : {}) });
      const raw = row[x.v];
      const value = parseCount(raw);
      if (value === null) {
        flag('non_numeric', true, `"${String(raw).slice(0, 40)}" isn't a plain number.`);
        continue;
      }
      if (value < 0) {
        flag('negative', true, `${value} is negative.`);
        continue;
      }
      // Recover missing dates where the submission makes them clear; flag every assumption.
      const span = x.def.defaultSpanDays;
      let start = givenStart;
      let end = givenEnd;
      let assumption = '';
      if (start && !end) {
        end = dayToIso(isoToDay(start) + span - 1);
        assumption = `No ending date; assumed ${end}.`;
      } else if (!start && end) {
        start = dayToIso(isoToDay(end) - span + 1);
        assumption = `No starting date; assumed ${start}.`;
      } else if (!start || !end) {
        const donor = complete.find((d) => d.x.def.program === x.def.program) ?? complete[0];
        if (donor?.start && donor.end) {
          start = donor.start;
          end = donor.end;
          assumption = `No dates; used the ${donor.x.def.label.toLowerCase()} dates from the same submission.`;
        } else if (submitted) {
          end = submitted;
          start = dayToIso(isoToDay(end) - span + 1);
          assumption = `No dates; assumed it ended on the submission date (${submitted}).`;
        } else {
          flag('missing_dates', true, 'No dates and no submission time.');
          continue;
        }
      }
      if (!start || !end) continue;
      const sd = isoToDay(start);
      const ed = isoToDay(end);
      if (ed < sd) {
        flag('end_before_start', true, `Ends ${end}, before it starts (${start}).`);
        continue;
      }
      if (sd < minDay || ed > maxDay) {
        flag('date_out_of_range', true, `Dates ${start} to ${end} look like a typo.`);
        continue;
      }
      const key = [metric, start, end, value, reporter ?? ''].join('|');
      if (seen.has(key)) {
        flag('duplicate', true, 'Same person, dates and value as an earlier row.');
        continue;
      }
      seen.add(key);
      if (assumption) flag('assumed_dates', false, assumption);
      if (ed - sd + 1 > longSpan) flag('long_span', false, `One report covers ${ed - sd + 1} days.`);
      const fact: Fact & { row: number } = { m: metric, s: start, e: end, v: value, t: submitted ?? end, row: rowNum };
      if (reporter) fact.r = reporter;
      if (assumption) fact.a = 1;
      facts.push(fact);
      rowMetrics.push(metric);
      if (!rowStart || start < rowStart) rowStart = start;
      if (!rowEnd || end > rowEnd) rowEnd = end;
    }
    submissions.push({ row: rowNum, reporter: reporter ?? null, submitted, metrics: rowMetrics, start: rowStart, end: rowEnd });
  });

  let scope: CleanResult['scope'] = null;
  let rowIssues = issues;
  if (opts.dataStart) {
    const limited = limitToStart(opts.dataStart, facts, issues, submissions, rowSubmitted);
    facts = limited.facts;
    rowIssues = limited.issues;
    submissions = limited.submissions;
    rowCount = limited.rows;
    scope = { start: opts.dataStart, droppedValues: limited.droppedValues, droppedRows: limited.droppedRows };
  }

  flagOverlaps(facts, rowIssues);

  return {
    generatedAt: opts.generatedAt,
    timezone: opts.timezone,
    latestSubmission: Number.isFinite(latest) ? dayToIso(latest) : null,
    rows: rowCount,
    facts,
    reporters,
    issues: rowIssues,
    submissions,
    unmappedColumns,
    terms: parseTerms(sheet.termsRows ?? [], rowIssues),
    targets: parseTargets(sheet.targetsRows ?? [], rowIssues),
    scope,
    sheetUrl: sheet.sheetUrl ?? null,
  };
}

type RowFact = Fact & { row: number };

/**
 * Keeps only what falls on or after the data start. A report that runs across the start
 * keeps the share of its value for the days from the start on (spread the same way the
 * charts spread it). A row is in scope when its reports reach the start; a row with no
 * usable report (a typo, say) is in scope when it was sent on or after the start. Issues
 * for rows out of scope are dropped as well.
 */
function limitToStart(start: ISODate, facts: RowFact[], issues: Issue[], submissions: Submission[], rowSubmitted: Map<number, ISODate | null>) {
  const startDay = isoToDay(start);
  const lastEnd = new Map<number, number>();
  for (const f of facts) lastEnd.set(f.row, Math.max(lastEnd.get(f.row) ?? -Infinity, isoToDay(f.e)));
  const inScope = (row: number) => {
    const end = lastEnd.get(row);
    if (end !== undefined) return end >= startDay;
    const sent = rowSubmitted.get(row);
    return !!sent && sent >= start;
  };

  let droppedValues = 0;
  const kept: RowFact[] = [];
  for (const f of facts) {
    const s = isoToDay(f.s);
    const e = isoToDay(f.e);
    if (e < startDay) {
      droppedValues++;
      continue;
    }
    if (s >= startDay) {
      kept.push(f);
      continue;
    }
    const mode = METRIC_BY_ID[f.m].activeDays;
    const active = (a: number, b: number) => {
      let n = 0;
      for (let d = a; d <= b; d++) if (mode === 'all' || weekdayIndex(d) < 5) n++;
      return n;
    };
    let total = active(s, e);
    let part = active(startDay, e);
    if (total === 0) {
      // A school report covering only a weekend is spread over all its days.
      total = e - s + 1;
      part = e - startDay + 1;
    }
    if (part === 0) {
      droppedValues++;
      continue;
    }
    kept.push({ ...f, s: start, v: (f.v * part) / total });
  }

  const rows = [...rowSubmitted.keys()];
  const inRows = rows.filter(inScope);
  return {
    facts: kept,
    issues: issues.filter((i) => i.row === null || inScope(i.row)),
    submissions: submissions.filter((s) => inScope(s.row)),
    rows: inRows.length,
    droppedValues,
    droppedRows: rows.length - inRows.length,
  };
}

/**
 * Reports whose dates overlap may count some days twice. Values are kept; each cluster of
 * overlapping reports gets one flag for a person to check, and reports that repeat the
 * same dates and value (from different people) are called out as possible duplicates.
 */
function flagOverlaps(facts: RowFact[], issues: Issue[]) {
  const groups = new Map<string, RowFact[]>();
  for (const f of facts) {
    const key = METRIC_BY_ID[f.m].scope === 'reporter' ? `${f.m}|${f.r ?? ''}` : f.m;
    const list = groups.get(key);
    if (list) list.push(f);
    else groups.set(key, [f]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : a.row - b.row));
    let cluster: RowFact[] = [];
    let clusterEnd = '';
    for (const f of list) {
      if (cluster.length && f.s <= clusterEnd) {
        cluster.push(f);
        if (f.e > clusterEnd) clusterEnd = f.e;
      } else {
        flagCluster(cluster, issues);
        cluster = [f];
        clusterEnd = f.e;
      }
    }
    flagCluster(cluster, issues);
  }
}

function flagCluster(cluster: RowFact[], issues: Issue[]) {
  if (cluster.length < 2) return;
  const firstRow = new Map<string, number>();
  const distinct: RowFact[] = [];
  for (const f of cluster) {
    const key = `${f.s}|${f.e}|${f.v}`;
    const first = firstRow.get(key);
    if (first === undefined) {
      firstRow.set(key, f.row);
      distinct.push(f);
    } else {
      issues.push({ row: f.row, type: 'possible_duplicate', metric: f.m, excluded: false, detail: `Same dates and value as row ${first}; it may have been reported twice.`, ...(f.r ? { reporter: f.r } : {}) });
    }
  }
  if (distinct.length < 2) return;
  const span = (f: RowFact) => isoToDay(f.e) - isoToDay(f.s);
  const anchor = distinct.reduce((a, b) => (span(b) > span(a) ? b : a));
  const others = distinct.filter((f) => f !== anchor).map((f) => f.row);
  const shown = others.length > 6 ? `${others.slice(0, 5).join(', ')} and ${others.length - 5} more` : others.join(', ');
  issues.push({
    row: anchor.row,
    type: 'overlap',
    metric: anchor.m,
    excluded: false,
    detail: `Dates overlap ${others.length} other report${others.length > 1 ? 's' : ''} (row${others.length > 1 ? 's' : ''} ${shown}); some days may be counted twice.`,
    ...(anchor.r ? { reporter: anchor.r } : {}),
  });
}

/** Optional "Dashboard Terms" tab: Term | Start date | End date. */
function parseTerms(rows: Cell[][], issues: Issue[]): Term[] {
  const terms: Term[] = [];
  for (const r of rows) {
    if (!r || r.every(isBlank)) continue;
    const label = String(r[0] ?? '').trim();
    const start = parseDateCell(r[1]);
    const end = parseDateCell(r[2]);
    if (!label || !start || !end || end < start) {
      issues.push({ row: null, type: 'settings', excluded: true, detail: `Terms tab: couldn't read "${label || '(no name)'}".` });
      continue;
    }
    terms.push({ label, start, end });
  }
  return terms.sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** Optional "Dashboard Targets" tab: Metric or program id | Year | Target. */
function parseTargets(rows: Cell[][], issues: Issue[]): Target[] {
  const targets: Target[] = [];
  for (const r of rows) {
    if (!r || r.every(isBlank)) continue;
    const key = String(r[0] ?? '').trim();
    const year = Number(r[1]);
    const value = parseCount(r[2] as Cell);
    if (!(key in METRIC_BY_ID || PROGRAM_IDS.has(key)) || !Number.isInteger(year) || value === null) {
      issues.push({ row: null, type: 'settings', excluded: true, detail: `Targets tab: couldn't read "${key || '(blank)'}".` });
      continue;
    }
    targets.push({ key, year, value });
  }
  return targets;
}
