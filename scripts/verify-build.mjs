// Sanity checks on dist-gas/ before it is pushed to Apps Script.

import { readFileSync, statSync } from 'node:fs';
import { PUBLIC_FUNCTIONS } from './build-server.mjs';

const html = readFileSync('dist-gas/index.html', 'utf8');
const code = readFileSync('dist-gas/Code.js', 'utf8');
const problems = [];

// HtmlService treats "<?" as a template scriptlet in some APIs; keep the page free of it.
if (html.includes('<?')) problems.push('index.html contains "<?"');
// The local-development mock and its synthetic data must never ship.
for (const marker of ['Mentor Amani', 'example-photo-', 'Anything else to share?']) {
  if (html.includes(marker)) problems.push(`index.html contains development-only data (${marker})`);
}
// Only the intended entry points may be callable from browsers.
const topLevel = [...code.matchAll(/^function (\w+)\(/gm)].map((m) => m[1]);
for (const fn of PUBLIC_FUNCTIONS) if (!topLevel.includes(fn)) problems.push(`Code.js is missing the ${fn} entry point`);
const extra = topLevel.filter((fn) => !PUBLIC_FUNCTIONS.includes(fn));
if (extra.length) problems.push(`Code.js exposes unexpected top-level functions: ${extra.join(', ')}`);

const mb = statSync('dist-gas/index.html').size / 1e6;
if (mb > 5) problems.push(`index.html is ${mb.toFixed(1)} MB; keep it under 5 MB`);

if (problems.length) {
  console.error('Build check failed:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Build check passed (index.html ${mb.toFixed(2)} MB; entry points: ${topLevel.join(', ')}).`);
