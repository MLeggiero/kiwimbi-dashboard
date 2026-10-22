// Reporter names arrive as free text ("jane doe", "Jane Doe.", "Doe Jane").
// They are normalized, mapped to a canonical spelling via the sheet's "Name Mappings"
// tab, and then replaced by a keyed hash before anything leaves the server.

type Cell = string | number | boolean | null | undefined;

export function cleanName(raw: Cell): string {
  if (typeof raw !== 'string' && typeof raw !== 'number') return '';
  return String(raw)
    .replace(/[.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase()))
    .join(' ');
}

export const nameKey = (raw: Cell) => cleanName(raw).toLowerCase();

/** Rows from the "Name Mappings" tab: column A = canonical name, column B = comma-separated variations. */
export function buildNameMap(rows: Cell[][]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const canonical = cleanName(row?.[0]);
    if (!canonical || canonical.toLowerCase() === 'canonical name') continue;
    map.set(canonical.toLowerCase(), canonical);
    const variations = typeof row[1] === 'string' ? row[1].split(',') : [];
    for (const v of variations) {
      const key = nameKey(v);
      if (key) map.set(key, canonical);
    }
  }
  return map;
}

export function canonicalName(raw: Cell, map: Map<string, string>): string {
  const cleaned = cleanName(raw);
  return cleaned ? map.get(cleaned.toLowerCase()) ?? cleaned : '';
}

export const isTestName = (name: string) => /^test(\s|\d|$)/i.test(name.trim());
