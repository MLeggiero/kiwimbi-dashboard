// All deployment-specific settings live in Script Properties
// (Apps Script editor > Project Settings > Script Properties), never in code.

export interface Config {
  sheetId: string;
  responsesTab: string;
  nameMapTab: string;
  termsTab: string;
  targetsTab: string;
  /** Optional 'YYYY-MM-DD': the dashboard leaves out everything before it (the current round of reporting). */
  dataStart: string | null;
  /** e.g. 'kiwimbi.org': viewers must sign in with an address in this domain. */
  allowedDomain: string | null;
  /** Optional: when set, only these addresses (plus managers) may view. */
  allowedEmails: string[];
  /** May see reporter names and the Data health page. */
  managerEmails: string[];
  cacheSeconds: number;
  timezone: string;
}

const list = (v: string | undefined) =>
  (v ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function readConfig(props: Record<string, string | undefined>): Config {
  const seconds = Number(props.CACHE_SECONDS);
  return {
    sheetId: (props.SHEET_ID ?? '').trim(),
    responsesTab: props.RESPONSES_TAB?.trim() || 'Form Responses',
    nameMapTab: props.NAME_MAP_TAB?.trim() || 'Name Mappings',
    termsTab: props.TERMS_TAB?.trim() || 'Dashboard Terms',
    targetsTab: props.TARGETS_TAB?.trim() || 'Dashboard Targets',
    dataStart: /^\d{4}-\d{2}-\d{2}$/.test(props.DATA_START?.trim() ?? '') ? props.DATA_START!.trim() : null,
    allowedDomain: (props.ALLOWED_DOMAIN ?? '').trim().replace(/^@/, '').toLowerCase() || null,
    allowedEmails: list(props.ALLOWED_EMAILS),
    managerEmails: list(props.MANAGER_EMAILS),
    cacheSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.min(21600, Math.max(60, Math.round(seconds))) : 600,
    timezone: props.TIMEZONE?.trim() || 'Africa/Nairobi',
  };
}
