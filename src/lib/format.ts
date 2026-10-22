const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtInt = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : int.format(Math.round(v)));
export const fmtOne = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : one.format(v));
export const fmtCompact = (v: number) => (Math.abs(v) < 10_000 ? int.format(Math.round(v)) : compact.format(v));

export function fmtPct(v: number | null, signed = true): string {
  if (v === null || !Number.isFinite(v)) return '–';
  const pct = Math.round(v * 100);
  return `${signed && pct > 0 ? '+' : ''}${pct}%`;
}

export function fmtAgo(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${Math.round(n) === 1 ? one : many}`;

/** Escape text before it goes into an HTML string (chart tooltips). */
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
