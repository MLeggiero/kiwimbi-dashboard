import { runPipeline } from '../shared/pipeline';
import { toOpsPayload, toPublicPayload } from '../shared/payload';
import type { CleanResult } from '../shared/types';
import { authorize, type AuthResult, type DenyReason } from './access';
import type { Config } from './config';
import { assertMaintainer_, getHashKey_, loadConfig_, viewerEmail_ } from './gas';
import { readSheet_ } from './sheet';
import { cacheGetString_, cachePutString_, cacheRead_, cacheWrite_ } from './store';

// Public entry points. The build wraps each export below in a top-level function so
// Apps Script can call it; everything else stays private inside the bundle and cannot
// be reached through google.script.run.

/** Web app entry. Serves the dashboard only to authorized viewers. */
export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  const cfg = loadConfig_();
  const auth = authorize(viewerEmail_(), cfg);
  logAccess_('open', auth);
  if (!auth.ok) {
    return HtmlService.createHtmlOutput(deniedPage_(auth.reason ?? 'no_identity', auth.email)).setTitle('Kiwimbi Impact');
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Kiwimbi Impact')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** Dashboard data for any authorized viewer: no names, links or row numbers. */
export function getDashboardData(): string {
  const { cfg, auth } = requireViewer_();
  const clean = loadClean_(cfg);
  return JSON.stringify(toPublicPayload(clean, { email: auth.email, isManager: auth.role === 'manager' }, today_(cfg)));
}

/** Data health detail, including reporter names. Managers only. */
export function getOpsData(): string {
  const { cfg, auth } = requireViewer_();
  if (auth.role !== 'manager') throw new Error('The Data health page is for dashboard managers.');
  logAccess_('ops', auth);
  return JSON.stringify(toOpsPayload(loadClean_(cfg)));
}

/**
 * Rebuilds the cache from the sheet. Run by the time-driven trigger (see installTriggers)
 * so viewers never wait on a sheet read. Anyone else must be an authorized viewer, and
 * refreshes are serialized under the script lock and limited to one a minute, so repeated
 * calls can't burn the owner's quota. It returns no data.
 */
export function refreshCache(e?: unknown): string {
  const cfg = loadConfig_();
  const fromTrigger = !!e && typeof e === 'object' && 'triggerUid' in (e as object);
  if (!fromTrigger && !authorize(viewerEmail_(), cfg).ok) return 'Not allowed.';
  const hashKey = getHashKey_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 'Busy: a refresh is already running.';
  try {
    const last = Number(cacheGetString_('lastRefresh') || 0);
    if (Date.now() - last < 60_000) return 'Skipped: refreshed less than a minute ago.';
    cachePutString_('lastRefresh', String(Date.now()), 3600);
    cacheWrite_('clean', buildClean_(cfg, hashKey), cfg.cacheSeconds);
    return 'Refreshed.';
  } finally {
    lock.releaseLock();
  }
}

/** Maintainer: run once from the editor to refresh data every 5 minutes. */
export function installTriggers(): string {
  assertMaintainer_(loadConfig_());
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === 'refreshCache') ScriptApp.deleteTrigger(t);
  }
  ScriptApp.newTrigger('refreshCache').timeBased().everyMinutes(5).create();
  const msg = 'Installed: the dashboard data refreshes every 5 minutes.';
  console.log(msg);
  return msg;
}

/** Maintainer: run from the editor to check settings and the sheet. Prints counts only, no data. */
export function checkSetup(): string {
  const cfg = loadConfig_();
  assertMaintainer_(cfg);
  const lines: string[] = [];
  const ok = (cond: boolean, text: string) => lines.push(`${cond ? 'OK  ' : 'FIX '} ${text}`);
  ok(!!cfg.sheetId, `SHEET_ID ${cfg.sheetId ? 'is set' : 'is missing'}`);
  ok(!!cfg.allowedDomain || cfg.allowedEmails.length > 0, `Access: ${cfg.allowedDomain ? `domain @${cfg.allowedDomain}` : 'no domain'}; ${cfg.allowedEmails.length} listed viewer(s); ${cfg.managerEmails.length} manager(s)`);
  ok(cfg.managerEmails.length > 0, 'MANAGER_EMAILS lists at least one manager');
  getHashKey_();
  lines.push('OK   NAME_HASH_KEY present');
  if (cfg.sheetId) {
    const clean = buildClean_(cfg);
    const counts: Record<string, number> = {};
    for (const i of clean.issues) counts[i.type] = (counts[i.type] ?? 0) + 1;
    ok(clean.facts.length > 0, `Read ${clean.rows} submissions; ${clean.facts.length} values usable`);
    ok(!clean.issues.some((i) => i.type === 'missing_column'), 'All expected form columns were found');
    for (const i of clean.issues) if (i.type === 'missing_column') lines.push(`       ${i.detail}`);
    lines.push(`INFO Issues by type: ${JSON.stringify(counts)}`);
    lines.push(`INFO Terms: ${clean.terms.length}; targets: ${clean.targets.length}; timezone ${clean.timezone}`);
    lines.push(clean.scope ? `INFO Data start ${clean.scope.start}: ${clean.scope.droppedValues} earlier values and ${clean.scope.droppedRows} earlier rows left out` : 'INFO DATA_START not set: every report is shown');
    for (const i of clean.issues) if (i.type === 'settings') lines.push(`       ${i.detail}`);
    if (clean.unmappedColumns.length) lines.push(`INFO Unused columns: ${clean.unmappedColumns.join(' | ')}`);
    cacheWrite_('clean', clean, cfg.cacheSeconds);
  }
  const triggers = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'refreshCache').length;
  ok(triggers > 0, `Refresh trigger ${triggers ? 'installed' : 'not installed (run installTriggers)'}`);
  const report = lines.join('\n');
  console.log(report);
  return report;
}

// ---------------------------------------------------------------- private

function requireViewer_(): { cfg: Config; auth: AuthResult } {
  const cfg = loadConfig_();
  const auth = authorize(viewerEmail_(), cfg);
  if (!auth.ok) {
    logAccess_('denied_data', auth);
    throw new Error('You do not have access to this dashboard.');
  }
  return { cfg, auth };
}

function loadClean_(cfg: Config): CleanResult {
  const cached = cacheRead_<CleanResult>('clean');
  if (cached) return cached;
  const hashKey = getHashKey_();
  const lock = LockService.getScriptLock();
  const locked = lock.tryLock(25000);
  try {
    if (locked) {
      const again = cacheRead_<CleanResult>('clean');
      if (again) return again;
    }
    const clean = buildClean_(cfg, hashKey);
    cacheWrite_('clean', clean, cfg.cacheSeconds);
    return clean;
  } finally {
    if (locked) lock.releaseLock();
  }
}

function buildClean_(cfg: Config, hashKey = getHashKey_()): CleanResult {
  const sheet = readSheet_(cfg);
  return runPipeline(sheet, {
    today: today_(cfg),
    timezone: cfg.timezone,
    generatedAt: new Date().toISOString(),
    hashName: (name) => hmacHex_(name, hashKey),
    dataStart: cfg.dataStart ?? undefined,
  });
}

function hmacHex_(value: string, key: string): string {
  return Utilities.computeHmacSha256Signature(value, key)
    .slice(0, 8)
    .map((b) => ((b + 256) % 256).toString(16).padStart(2, '0'))
    .join('');
}

function today_(cfg: Config): string {
  return Utilities.formatDate(new Date(), cfg.timezone, 'yyyy-MM-dd');
}

function logAccess_(event: string, auth: AuthResult) {
  console.log(JSON.stringify({ event, ok: auth.ok, role: auth.role ?? null, reason: auth.reason ?? null, user: auth.email || null }));
}

const esc_ = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function deniedPage_(reason: DenyReason, email: string): string {
  const who = email ? `You're signed in as <strong>${esc_(email)}</strong>.` : '';
  const messages: Record<DenyReason, string> = {
    no_identity: `We couldn't confirm which Google account you're using. Sign in with your Kiwimbi Google account and reload. If you use several Google accounts in this browser, open the link in a private window or a separate browser profile.`,
    wrong_domain: `This dashboard is only available to Kiwimbi Google accounts. ${who}`,
    not_on_list: `Your account isn't on this dashboard's access list yet. ${who} Ask a dashboard manager to add you.`,
    not_configured: `This dashboard hasn't finished setup: its access list is empty. ${who}`,
  };
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:'Open Sans',system-ui,-apple-system,'Segoe UI',sans-serif;background:#fbf8f1;color:#1c2420;display:grid;place-items:center;min-height:100vh">
<main style="max-width:520px;margin:24px;padding:28px 0 0;border-top:4px solid #a84830">
<h1 style="font-size:28px;line-height:1.1;margin:0 0 12px">No access to Kiwimbi Impact</h1>
<p style="font-size:16px;line-height:1.6;color:#48534e;margin:0">${messages[reason]}</p>
</main></body></html>`;
}
