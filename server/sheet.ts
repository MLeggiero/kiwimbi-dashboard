import type { Cell, SheetExport } from '../shared/pipeline';
import type { Config } from './config';

// Reads the sheet through the Sheets API advanced service (enabled in appsscript.json).
// Unlike SpreadsheetApp.openById, which demands edit access to every spreadsheet, the
// API works with the read-only scope, so the script can never change the data.
//
// Values come back unformatted: numbers stay numbers and date cells arrive as
// spreadsheet serial numbers (days since 1899-12-30, in the sheet's own time zone),
// which shared/dates.ts parseDateCell converts to calendar dates.

const a1Tab = (name: string) => `'${name.replace(/'/g, "''")}'`;

export function readSheet_(cfg: Config): SheetExport & { timezone: string } {
  if (!cfg.sheetId) throw new Error('The dashboard is not set up yet: SHEET_ID is missing from Script Properties.');
  const api = Sheets?.Spreadsheets;
  if (!api?.Values) throw new Error('The Google Sheets API service is not enabled for this script (see README > Troubleshooting).');

  const meta = api.get(cfg.sheetId, { fields: 'spreadsheetUrl,properties.timeZone,sheets.properties(title,sheetId)' });
  const tabs = new Map<string, number>();
  for (const s of meta.sheets ?? []) if (s.properties?.title !== undefined) tabs.set(s.properties.title, s.properties.sheetId ?? 0);
  if (!tabs.has(cfg.responsesTab)) throw new Error(`Tab "${cfg.responsesTab}" was not found in the spreadsheet.`);

  const wanted = [cfg.responsesTab, cfg.nameMapTab, cfg.termsTab, cfg.targetsTab].filter((t, i, all) => tabs.has(t) && all.indexOf(t) === i);
  const res = api.Values.batchGet(cfg.sheetId, {
    ranges: wanted.map(a1Tab),
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
    majorDimension: 'ROWS',
  });
  const byTab = new Map<string, Cell[][]>();
  wanted.forEach((t, i) => byTab.set(t, (res.valueRanges?.[i]?.values ?? []) as Cell[][]));
  const optionalTab = (name: string) => (byTab.get(name) ?? []).slice(1);

  const responses = byTab.get(cfg.responsesTab) ?? [];
  return {
    header: responses[0] ?? [],
    rows: responses.slice(1),
    nameMapRows: optionalTab(cfg.nameMapTab),
    termsRows: optionalTab(cfg.termsTab),
    targetsRows: optionalTab(cfg.targetsTab),
    sheetUrl: meta.spreadsheetUrl ? `${meta.spreadsheetUrl}#gid=${tabs.get(cfg.responsesTab)}` : null,
    timezone: meta.properties?.timeZone ?? cfg.timezone,
  };
}
