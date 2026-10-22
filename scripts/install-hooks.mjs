// Points git at .githooks/ so the no-data guard runs before every commit and push.
// Runs automatically on `npm install` (the "prepare" script). Safe to run again.

import { execSync } from 'node:child_process';
import { chmodSync, readdirSync } from 'node:fs';

try {
  execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  if (process.platform !== 'win32') for (const f of readdirSync('.githooks')) chmodSync(`.githooks/${f}`, 0o755);
  console.log('Git hooks enabled: the no-data guard runs before each commit and push.');
} catch {
  console.log('Not a git checkout; skipped installing git hooks.');
}
