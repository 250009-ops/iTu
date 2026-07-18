#!/usr/bin/env node
/**
 * Push GitHub Actions workflow (requires `workflow` OAuth scope on git push).
 *
 * If push fails, complete:
 *   gh auth refresh -h github.com -s workflow
 * then re-run this script.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = path.join(root, '.github', 'workflows', 'desktop-releases.yml');

if (!existsSync(workflow)) {
  console.error('Missing', workflow);
  process.exit(1);
}

console.log('Setting GitHub Actions secrets (if not already set)…');
const host = process.env.VPS_HOST || '170.168.6.42';
const user = process.env.VPS_USER || 'root';
const password = process.env.VPS_PASSWORD;
if (!password) {
  console.error('Set VPS_PASSWORD before running.');
  process.exit(1);
}

for (const [name, value] of [
  ['VPS_HOST', host],
  ['VPS_USER', user],
  ['VPS_PASSWORD', password],
]) {
  const r = spawnSync('gh', ['secret', 'set', name, '--body', value, '--repo', '250009-ops/iTu'], {
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('\nCommitting workflow file…');
spawnSync('git', ['add', workflow], { cwd: root, stdio: 'inherit' });
const status = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root });
if (status.status === 0) {
  console.log('Workflow already committed.');
} else {
  spawnSync(
    'git',
    ['commit', '-m', 'Add GitHub Actions workflow for desktop releases.'],
    { cwd: root, stdio: 'inherit' },
  );
}

console.log('\nPushing to origin/main…');
const push = spawnSync('git', ['push', 'origin', 'main'], { cwd: root, stdio: 'inherit' });
if (push.status !== 0) {
  console.error(
    '\nPush failed — grant workflow scope:\n  gh auth refresh -h github.com -s workflow\nThen re-run: node deploy/setup-github-desktop-ci.mjs',
  );
  process.exit(push.status ?? 1);
}

console.log('\nTriggering workflow…');
spawnSync(
  'gh',
  ['workflow', 'run', 'desktop-releases.yml', '--repo', '250009-ops/iTu'],
  { stdio: 'inherit', shell: true },
);

console.log('\nDone. Watch: gh run list --repo 250009-ops/iTu --workflow desktop-releases.yml');
