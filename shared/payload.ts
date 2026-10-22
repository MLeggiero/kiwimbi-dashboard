import { MANAGER_ONLY_METRICS } from './metrics';
import { countMentors } from './mentors';
import type { CleanResult, ISODate, OpsPayload, PublicFact, PublicPayload } from './types';

/**
 * The browser payload for every allowed viewer. Fields are copied one by one so nothing
 * identifying can slip through: no names, no per-person ids, no row numbers, no issue
 * details. Mentor counts arrive pre-aggregated. Managers also get the manager-only
 * metrics (staff and tailoring meals) and the report counts from the data checks.
 */
export function toPublicPayload(clean: CleanResult, viewer: PublicPayload['viewer'], today: ISODate): PublicPayload {
  const isManager = viewer.isManager === true;
  const facts: PublicFact[] = clean.facts
    .filter((f) => isManager || !MANAGER_ONLY_METRICS.has(f.m))
    .map((f) => {
      const out: PublicFact = { m: f.m, s: f.s, e: f.e, v: f.v, t: f.t };
      if (f.a) out.a = 1;
      return out;
    });
  return {
    version: 1,
    generatedAt: clean.generatedAt,
    today,
    timezone: clean.timezone,
    latestSubmission: clean.latestSubmission,
    facts,
    mentors: countMentors(clean.facts, clean.terms, today),
    terms: clean.terms,
    targets: clean.targets,
    quality: isManager
      ? {
          rows: clean.rows,
          used: clean.facts.length,
          excluded: clean.issues.filter((i) => i.excluded && i.row !== null).length,
          flagged: clean.issues.filter((i) => !i.excluded).length,
        }
      : null,
    viewer: { email: viewer.email, isManager },
  };
}

/** Managers only: reporter names, row-level issues and a link to the sheet. */
export function toOpsPayload(clean: CleanResult): OpsPayload {
  const used = new Set<string>();
  for (const s of clean.submissions) if (s.reporter) used.add(s.reporter);
  for (const i of clean.issues) if (i.reporter) used.add(i.reporter);
  return {
    version: 1,
    generatedAt: clean.generatedAt,
    reporters: [...used].map((id) => ({ id, name: clean.reporters[id] ?? 'Unknown' })).sort((a, b) => a.name.localeCompare(b.name)),
    issues: clean.issues,
    submissions: clean.submissions,
    unmappedColumns: clean.unmappedColumns,
    sheetUrl: clean.sheetUrl,
  };
}
