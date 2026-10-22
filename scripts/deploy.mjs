// One-step update of the live web app: checks, builds and uploads the code (npm run push),
// saves it as a new version, and points the existing deployment at that version, so the
// link people already use serves the update. (Uploading alone only changes the editor copy;
// every deployment stays on the version it was deployed with.)
//
// The deployment ID stays out of the repository. The first time, pass it on the command line
// (npm run deploy -- <deploymentId>); it is saved in .clasp-deployment (git-ignored) for next
// time. The KIWIMBI_DEPLOYMENT_ID environment variable also works. Find the ID with:
// npx clasp list-deployments

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const idFile = resolve(root, '.clasp-deployment');
// Tolerate files saved by any editor or shell (byte-order marks, UTF-16, stray spaces).
const clean = (s) => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '');
const arg = clean(process.argv[2]);
const id = arg || clean(process.env.KIWIMBI_DEPLOYMENT_ID) || (existsSync(idFile) ? clean(readFileSync(idFile, 'latin1')) : '');

if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) {
  console.error(`No deployment ID yet. Run "npx clasp list-deployments", copy the ID of the web-app deployment
people use (it starts with AKfycb: the part of the link between /s/ and /exec), then run:
  npm run deploy -- <that ID>
It is saved in .clasp-deployment (git-ignored), so next time "npm run deploy" is enough.`);
  process.exit(1);
}
if (arg) writeFileSync(idFile, `${arg}\n`);

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const capture = (cmd) => execSync(cmd, { cwd: root, encoding: 'utf8' });

try {
  run('npm run push');
  const label = `Dashboard update ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
  const out = capture(`npx clasp create-version "${label}"`);
  const version = /version\s+(\d+)/i.exec(out)?.[1];
  if (!version) {
    console.error(`Couldn't read the new version number from clasp:\n${out}`);
    process.exit(1);
  }
  run(`npx clasp update-deployment ${id} --versionNumber ${version} --description "${label}"`);
  console.log(`\nDone: the web app now serves version ${version}. Reload any open tabs.`);
} catch {
  // The command's own error is already printed above; skip Node's stack trace.
  console.error(`
Deploy stopped, and the live web app is unchanged (see the error above).
If it mentions invalid_grant or invalid_rapt, clasp's Google sign-in has expired:
  npx clasp login
then run "npm run deploy" again.`);
  process.exit(1);
}
