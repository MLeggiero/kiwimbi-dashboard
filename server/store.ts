// Server-side cache. CacheService caps each value at 100 KB, so JSON is split into chunks.
// The cache lives inside Google, readable only by this script.

/** Set at build time from the server code (scripts/build-server.mjs). */
declare const __CODE_VERSION__: string;

// Keys carry the code version: after an update, the new code never reads data cached by
// the old code in an older shape (it rebuilds from the sheet instead).
const PREFIX = `kiwimbi:${__CODE_VERSION__}:`;
const CHUNK_CHARS = 30000;

export function cacheRead_<T>(name: string): T | null {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get(`${PREFIX}${name}:n`));
  if (!n) return null;
  const keys = Array.from({ length: n }, (_, i) => `${PREFIX}${name}:${i}`);
  const parts = cache.getAll(keys);
  let json = '';
  for (const k of keys) {
    const part = parts[k];
    if (part === undefined || part === null) return null;
    json += part;
  }
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function cacheWrite_(name: string, value: unknown, seconds: number): void {
  const json = JSON.stringify(value);
  const n = Math.max(1, Math.ceil(json.length / CHUNK_CHARS));
  const entries: Record<string, string> = { [`${PREFIX}${name}:n`]: String(n) };
  for (let i = 0; i < n; i++) entries[`${PREFIX}${name}:${i}`] = json.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
  CacheService.getScriptCache().putAll(entries, seconds);
}

export function cacheGetString_(key: string): string | null {
  return CacheService.getScriptCache().get(PREFIX + key);
}

export function cachePutString_(key: string, value: string, seconds: number): void {
  CacheService.getScriptCache().put(PREFIX + key, value, seconds);
}
