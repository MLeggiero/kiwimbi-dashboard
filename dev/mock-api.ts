// Local development stand-in for google.script.run. Serves the synthetic sheet through
// the same pipeline the server uses. Add ?role=viewer to the URL to preview as a
// non-manager, ?start=YYYY-MM-DD to preview a DATA_START, ?today=YYYY-MM-DD to preview another
// day (later weeks of fake contact hours, say), or ?fail=1 for the error state.

import { makeFakeSheet } from './fake-sheet';
import { runPipeline } from '../shared/pipeline';
import { toOpsPayload, toPublicPayload } from '../shared/payload';
import type { CleanResult } from '../shared/types';

const todayNairobi = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function fakeHash(name: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}

const cached = new Map<string, CleanResult>();

export async function call(fn: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 300));
  const params = new URLSearchParams(location.search);
  if (params.get('fail')) throw new Error('You do not have access to this dashboard.');
  const iso = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(params.get(k) ?? '') ? params.get(k)! : '');
  const today = iso('today') || todayNairobi();
  const start = iso('start');
  const key = `${today}|${start}`;
  if (!cached.has(key)) cached.set(key, runPipeline(makeFakeSheet({ today }), { today, timezone: 'Africa/Nairobi', generatedAt: new Date().toISOString(), hashName: fakeHash, dataStart: start || undefined }));
  const clean = cached.get(key)!;
  const isManager = params.get('role') !== 'viewer';
  if (fn === 'getDashboardData') return JSON.stringify(toPublicPayload(clean, { email: 'you@example.org', isManager }, today));
  if (fn === 'getOpsData') {
    if (!isManager) throw new Error('The Data health page is for dashboard managers.');
    return JSON.stringify(toOpsPayload(clean));
  }
  throw new Error(`Unknown server function: ${fn}`);
}
