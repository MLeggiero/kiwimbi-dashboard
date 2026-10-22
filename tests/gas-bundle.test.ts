// Runs the real Apps Script bundle (dist Code.js as built by scripts/build-server.mjs)
// inside a Node VM with stand-ins for Google's services, fed by the synthetic sheet.

import { createHmac, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import { bundleServer, PUBLIC_FUNCTIONS } from '../scripts/build-server.mjs';
import { makeFakeSheet } from '../dev/fake-sheet';

let code = '';
beforeAll(async () => {
  code = await bundleServer();
});

interface EnvOptions {
  active: string;
  effective?: string;
  props?: Record<string, string>;
}

function makeEnv({ active, effective = 'owner@kiwimbi.org', props = {} }: EnvOptions) {
  const ctx = vm.createContext({});
  const sheet = makeFakeSheet({ today: '2026-09-23' });
  // Like the real Sheets API: dates as serial numbers (fraction = time of day), empty cells
  // as '', and trailing empty cells dropped from each row.
  const toSerial = (c: unknown) => {
    if (c === null || c === undefined) return '';
    const m = typeof c === 'string' ? /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?$/.exec(c) : null;
    if (!m) return c;
    const day = Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86_400_000;
    return day + 25569 + (m[4] ? (+m[4] * 3600 + +m[5] * 60 + +m[6]) / 86_400 : 0);
  };
  const apiRow = (r: unknown[]) => {
    const out = r.map(toSerial);
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
  };
  // The live sheet repeats titles ("Starting Date" x10) and leaves unnamed columns blank.
  const liveHeader = sheet.header.map((h) => String(h).replace(/^(Starting|Ending) Date \d+$/, '$1 Date').replace(/^Column 33$/, ''));
  const tabs: Record<string, unknown[][]> = {
    'Form Responses': [liveHeader, ...sheet.rows].map(apiRow),
    'Name Mappings': (sheet.nameMapRows ?? []).map(apiRow),
    'Dashboard Terms': [['Term', 'Start', 'End'], ...(sheet.termsRows ?? [])].map(apiRow),
  };
  const properties: Record<string, string> = { SHEET_ID: 'fake-sheet-id', ALLOWED_DOMAIN: 'kiwimbi.org', MANAGER_EMAILS: 'manager@kiwimbi.org', ...props };
  const cache = new Map<string, string>();
  const logs: string[] = [];
  const counters = { opens: 0, triggers: 0 };

  const html = (kind: string, body: string) => {
    const out = { kind, body, title: '', setTitle(t: string) { out.title = t; return out; }, addMetaTag() { return out; }, setXFrameOptionsMode() { return out; } };
    return out;
  };

  Object.assign(ctx, {
    console: { log: (m: string) => logs.push(String(m)), warn: (m: string) => logs.push(String(m)), error: (m: string) => logs.push(String(m)) },
    Session: {
      getActiveUser: () => ({ getEmail: () => active }),
      getEffectiveUser: () => ({ getEmail: () => effective }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({ ...properties }),
        getProperty: (k: string) => properties[k] ?? null,
        setProperty: (k: string, v: string) => {
          properties[k] = v;
        },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => cache.get(k) ?? null,
        getAll: (keys: string[]) => Object.fromEntries(keys.filter((k) => cache.has(k)).map((k) => [k, cache.get(k)])),
        put: (k: string, v: string) => void cache.set(k, v),
        putAll: (o: Record<string, string>) => Object.entries(o).forEach(([k, v]) => cache.set(k, v)),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => undefined, releaseLock: () => undefined }) },
    Utilities: {
      formatDate: (date: Date, tz: string, pattern: string) => {
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
            .formatToParts(date)
            .map((p) => [p.type, p.value]),
        );
        const ymd = `${parts.year}-${parts.month}-${parts.day}`;
        return pattern === 'yyyy-MM-dd' ? ymd : `${ymd}T${parts.hour}:${parts.minute}:${parts.second}`;
      },
      computeHmacSha256Signature: (value: string, key: string) => [...createHmac('sha256', key).update(value).digest()].map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => randomUUID(),
    },
    Sheets: {
      Spreadsheets: {
        get: (id: string) => {
          counters.opens++;
          if (id !== 'fake-sheet-id') throw new Error('Requested entity was not found.');
          return { spreadsheetUrl: 'https://example.invalid/sheet/edit', properties: { timeZone: 'Africa/Nairobi' }, sheets: Object.keys(tabs).map((title, i) => ({ properties: { title, sheetId: i * 101 } })) };
        },
        Values: {
          batchGet: (_id: string, args: { ranges: string[]; valueRenderOption: string; dateTimeRenderOption: string }) => {
            if (args.valueRenderOption !== 'UNFORMATTED_VALUE' || args.dateTimeRenderOption !== 'SERIAL_NUMBER') throw new Error('unexpected render options');
            return { valueRanges: args.ranges.map((r) => ({ range: r, values: tabs[r.replace(/^'|'$/g, '').replace(/''/g, "'")] })) };
          },
        },
      },
    },
    HtmlService: {
      createHtmlOutputFromFile: (name: string) => html('file', name),
      createHtmlOutput: (body: string) => html('inline', body),
      XFrameOptionsMode: { DEFAULT: 'DEFAULT', ALLOWALL: 'ALLOWALL' },
    },
    ScriptApp: {
      getProjectTriggers: () => [],
      deleteTrigger: () => undefined,
      newTrigger: () => {
        const b = { timeBased: () => b, everyMinutes: () => b, create: () => void counters.triggers++ };
        return b;
      },
    },
  });
  vm.runInContext(code, ctx);
  const call = (name: string, ...args: unknown[]) => (ctx as Record<string, (...a: unknown[]) => unknown>)[name](...args);
  return { ctx, call, logs, counters, properties, cache };
}

describe('Apps Script bundle', () => {
  it('exposes only the intended top-level functions', () => {
    const { ctx } = makeEnv({ active: 'staff@kiwimbi.org' });
    const globals = ctx as Record<string, unknown>;
    for (const name of PUBLIC_FUNCTIONS) expect(typeof globals[name], name).toBe('function');
    for (const hidden of ['loadClean_', 'buildClean_', 'readSheet_', 'runPipeline', 'authorize', 'hmacHex_', 'toOpsPayload']) expect(globals[hidden], hidden).toBeUndefined();
  });

  it('serves the app to domain viewers and a no-access page to everyone else', () => {
    const page = makeEnv({ active: 'staff@kiwimbi.org' }).call('doGet') as { kind: string; body: string };
    expect(page).toMatchObject({ kind: 'file', body: 'index' });
    for (const active of ['', 'someone@gmail.com']) {
      const denied = makeEnv({ active }).call('doGet') as { kind: string; body: string };
      expect(denied.kind).toBe('inline');
      expect(denied.body).toContain('No access to Kiwimbi Impact');
    }
    const escaped = makeEnv({ active: '<script>x</script>@evil.com' }).call('doGet') as { body: string };
    expect(escaped.body).not.toContain('<script>x');
  });

  it('returns minimized data to viewers, from cache after the first read', () => {
    const env = makeEnv({ active: 'staff@kiwimbi.org' });
    const json = env.call('getDashboardData') as string;
    const payload = JSON.parse(json);
    expect(payload.viewer).toEqual({ email: 'staff@kiwimbi.org', isManager: false });
    expect(payload.facts.length).toBeGreaterThan(300);
    expect(payload.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const leak of ['Mentor Amani', 'Meals Lead', 'drive.google.com', 'example.invalid', 'about 4', '"row"', '"r"', 'detail']) expect(json).not.toContain(leak);
    for (const f of payload.facts) for (const k of Object.keys(f)) expect(['m', 's', 'e', 'v', 't', 'a', 'est', 'loc', 'sch', 'site', 'lvl']).toContain(k);
    expect(Object.keys(payload.mentors.week).length).toBeGreaterThan(10);
    expect(payload.quality).toBeNull();
    expect(payload.facts.some((f: { m: string }) => f.m === 'meals_staff_tailoring')).toBe(false);
    env.call('getDashboardData');
    expect(env.counters.opens).toBe(1);
    expect(env.properties.NAME_HASH_KEY).toBeTruthy();
  });

  it('adds staff meals and report counts for managers', () => {
    const payload = JSON.parse(makeEnv({ active: 'manager@kiwimbi.org' }).call('getDashboardData') as string);
    expect(payload.viewer).toEqual({ email: 'manager@kiwimbi.org', isManager: true });
    expect(payload.facts.some((f: { m: string }) => f.m === 'meals_staff_tailoring')).toBe(true);
    expect(payload.quality.used).toBe(payload.facts.length);
  });

  it('ignores data cached by an earlier release', () => {
    const env = makeEnv({ active: 'staff@kiwimbi.org' });
    // What an older release left in the cache: a different shape, missing current fields.
    env.cache.set('kiwimbi:v1:clean:n', '1');
    env.cache.set('kiwimbi:v1:clean:0', JSON.stringify({ facts: [], terms: [], targets: [], issues: [], rows: 0 }));
    const payload = JSON.parse(env.call('getDashboardData') as string);
    expect(payload.mentors).toBeTruthy();
    expect(payload.facts.length).toBeGreaterThan(300);
    expect([...env.cache.keys()].some((k) => /^kiwimbi:[0-9a-f]{10}:clean:n$/.test(k))).toBe(true);
  });

  it('explains a missing responses tab instead of failing silently', () => {
    expect(() => makeEnv({ active: 'staff@kiwimbi.org', props: { RESPONSES_TAB: 'Responses 2' } }).call('getDashboardData')).toThrow(/Tab "Responses 2" was not found/);
  });

  it('refuses data to anyone the access rules reject', () => {
    expect(() => makeEnv({ active: '' }).call('getDashboardData')).toThrow(/do not have access/);
    expect(() => makeEnv({ active: 'someone@gmail.com' }).call('getDashboardData')).toThrow(/do not have access/);
  });

  it('keeps names and row detail for managers only', () => {
    expect(() => makeEnv({ active: 'staff@kiwimbi.org' }).call('getOpsData')).toThrow(/managers/);
    const ops = JSON.parse(makeEnv({ active: 'manager@kiwimbi.org' }).call('getOpsData') as string);
    expect(ops.reporters.map((r: { name: string }) => r.name)).toContain('Mentor Amani');
    expect(ops.issues.length).toBeGreaterThan(0);
  });

  it('blocks maintenance functions when called through the web app by a viewer', () => {
    const viaWebApp = makeEnv({ active: 'staff@kiwimbi.org', effective: 'owner@kiwimbi.org' });
    expect(() => viaWebApp.call('installTriggers')).toThrow(/Apps Script editor/);
    expect(() => viaWebApp.call('checkSetup')).toThrow(/Apps Script editor/);
    const editorNotManager = makeEnv({ active: 'owner@kiwimbi.org', effective: 'owner@kiwimbi.org' });
    expect(() => editorNotManager.call('checkSetup')).toThrow(/MANAGER_EMAILS/);
    const fromEditor = makeEnv({ active: 'owner@kiwimbi.org', effective: 'owner@kiwimbi.org', props: { MANAGER_EMAILS: 'owner@kiwimbi.org, manager@kiwimbi.org' } });
    expect(fromEditor.call('installTriggers')).toMatch(/Installed/);
    expect(fromEditor.counters.triggers).toBe(1);
    const report = fromEditor.call('checkSetup') as string;
    expect(report).toContain('OK   SHEET_ID is set');
    expect(report).not.toContain('Mentor');
  });

  it('refreshes the cache for the trigger or signed-in viewers only, at most once a minute', () => {
    expect(makeEnv({ active: 'someone@gmail.com' }).call('refreshCache')).toBe('Not allowed.');
    expect(makeEnv({ active: '' }).call('refreshCache')).toBe('Not allowed.');
    const trigger = makeEnv({ active: '' });
    expect(trigger.call('refreshCache', { triggerUid: '123', authMode: 'FULL' })).toBe('Refreshed.');
    expect(trigger.call('refreshCache', { triggerUid: '123', authMode: 'FULL' })).toMatch(/Skipped/);
    const viewer = makeEnv({ active: 'staff@kiwimbi.org' });
    expect(viewer.call('refreshCache')).toBe('Refreshed.');
    expect(viewer.counters.opens).toBe(1);
  });
});
