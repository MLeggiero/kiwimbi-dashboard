// Fails if the repository is about to contain data or credentials.
//
// Runs as a git pre-commit and pre-push hook (installed by `npm install`, see
// scripts/install-hooks.mjs), before `npm run push`, and in CI. It checks every file git
// tracks or would pick up: forbidden file types, anything that looks like a Google
// credential or document ID, and (optionally) a private list of real names and IDs kept
// OUTSIDE the repo at ~/.kiwimbi-guard-denylist or $KIWIMBI_GUARD_DENYLIST.
// Terms from that list are never printed, only their line number in the list.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const files = execSync('git ls-files --cached --others --exclude-standard -z', { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const FORBIDDEN_NAME = [
  { re: /\.(xlsx|xls|xlsm|ods|numbers|csv|tsv|parquet|sqlite|db)$/i, why: 'spreadsheet or data file' },
  { re: /\.(gsheet|gdoc|gslides|gform)$/i, why: 'Google Drive shortcut (contains a document ID)' },
  { re: /\.(har|pdf)$/i, why: 'browser capture or document that may hold data' },
  { re: /(^|\/)kiwimbi-[^/]*\.(png|csv|pdf)$/i, why: 'dashboard export' },
  { re: /(^|\/)screen ?shot[^/]*\.(png|jpe?g|webp)$/i, why: 'screenshot (may show data)' },
  { re: /(^|\/)\.clasp(rc)?\.json$/i, why: 'Apps Script project pointer or login' },
  { re: /(^|\/)(creds|credentials[^/]*|client_secret[^/]*|[^/]*service-account[^/]*)\.json$/i, why: 'credential file' },
  { re: /\.(p12|pfx|pem|key)$/i, why: 'key file' },
  { re: /\.export\.json$/i, why: 'data export' },
  { re: /(^|\/)\.kiwimbi-guard-denylist$/i, why: 'the private denylist itself' },
];

const FORBIDDEN_CONTENT = [
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, why: 'a private key' },
  { re: /\bya29\.[0-9A-Za-z_-]{20,}/, why: 'a Google OAuth access token' },
  { re: /"refresh_token"\s*:/, why: 'an OAuth refresh token' },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, why: 'a Google API key' },
  { re: /\bGOCSPX-[0-9A-Za-z_-]{20,}/, why: 'a Google OAuth client secret' },
  { re: /docs\.google\.com\/(spreadsheets|document|forms)\/d\/[0-9A-Za-z_-]{25,}/, why: 'a link to a specific Google document' },
  { re: /drive\.google\.com\/(open\?id=|file\/d\/)[0-9A-Za-z_-]{25,}/, why: 'a link to a Drive file' },
  { re: /script\.google\.com\/(a\/[^/\s]+\/)?macros\/s\/[0-9A-Za-z_-]{30,}/, why: 'a deployed web app link' },
  // Bare Drive, Sheets and Apps Script IDs: 44+ URL-safe characters starting with "1".
  { re: /(^|[^0-9A-Za-z_-])1[0-9A-Za-z_-]{43,70}(?![0-9A-Za-z_-])/, why: 'what looks like a Google document or script ID', skip: /(^|\/)package-lock\.json$/ },
];

const MAX_BYTES = 5_000_000;

function loadDenylist() {
  const path = process.env.KIWIMBI_GUARD_DENYLIST || join(homedir(), '.kiwimbi-guard-denylist');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line, i) => ({ term: line.trim().toLowerCase(), line: i + 1 }))
    .filter((t) => t.term.length >= 4 && !t.term.startsWith('#'));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const denylist = loadDenylist().map((t) => ({ ...t, re: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(t.term)}([^\\p{L}\\p{N}]|$)`, 'iu') }));

const problems = [];
for (const f of files) {
  for (const { re, why } of FORBIDDEN_NAME) if (re.test(f)) problems.push(`${f}: ${why} must never be committed`);
  let size;
  try {
    size = statSync(f).size;
  } catch {
    continue; // deleted in the working tree
  }
  if (size > MAX_BYTES) {
    problems.push(`${f}: ${(size / 1e6).toFixed(1)} MB is too large to be source code`);
    continue;
  }
  const buf = readFileSync(f);
  if (buf.subarray(0, 8000).includes(0)) continue; // binary (fonts, images): name rules above still apply
  const text = buf.toString('utf8');
  for (const { re, why, skip } of FORBIDDEN_CONTENT) if (!(skip && skip.test(f)) && re.test(text)) problems.push(`${f}: contains ${why}`);
  for (const t of denylist) if (t.re.test(text)) problems.push(`${f}: contains a term from your private denylist (line ${t.line})`);
}

if (problems.length) {
  console.error('No-data guard failed:\n  ' + problems.join('\n  '));
  console.error('\nNothing was committed or uploaded. Remove the data, or add the file to .gitignore.');
  process.exit(1);
}
console.log(`No-data guard passed (${files.length} files checked${denylist.length ? `, ${denylist.length} private terms` : ''}).`);
