import type { ECharts } from './echarts';

export interface TableData {
  columns: string[];
  rows: (string | number | null)[][];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function save(filename: string, url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function tableToCsv(t: TableData): string {
  const cell = (v: string | number | null) => {
    let s = v === null ? '' : String(v);
    // Text starting with = + - @ could run as a formula when the CSV is opened.
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [t.columns, ...t.rows].map((r) => r.map(cell).join(',')).join('\n');
}

export function downloadCsv(title: string, table: TableData) {
  const url = URL.createObjectURL(new Blob([tableToCsv(table)], { type: 'text/csv' }));
  save(`kiwimbi-${slug(title)}.csv`, url);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadPng(title: string, chart: ECharts, background: string) {
  save(`kiwimbi-${slug(title)}.png`, chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: background }));
}
