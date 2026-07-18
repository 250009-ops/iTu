#!/usr/bin/env node
/**
 * Push macOS CI workflow fix, run GitHub Actions, and verify live releases.
 *
 * Requires `workflow` scope on the active gh account (250009-ops):
 *   gh auth refresh -h github.com -s workflow
 *
 * Or set GH_TOKEN to a classic PAT with repo + workflow scopes.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = '250009-ops/iTu';
const workflow = path.join(root, '.github', 'workflows', 'desktop-releases.yml');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    process.exit(r.status ?? 1);
  }
  return (r.stdout || '').trim();
}

function hasWorkflowScope() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return true;
  const status = run('gh', ['auth', 'status'], { stdio: 'pipe' });
  const match = status.match(
    /✓ Logged in to github.com account ([^\n]+)\n(?:.*\n)*?  - Active account: true\n(?:.*\n)*?  - Token scopes: '([^']+)'/,
  );
  return Boolean(match?.[2]?.includes('workflow'));
}

function gitPushMain() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    run('git', [
      'push',
      `https://x-access-token:${token}@github.com/${repo}.git`,
      'main',
    ]);
    return;
  }
  run('git', ['push', 'origin', 'main']);
}

async function waitForRun(startedAfter) {
  for (let i = 0; i < 90; i++) {
    const list = run('gh', [
      'run',
      'list',
      '--repo',
      repo,
      '--workflow',
      'desktop-releases.yml',
      '--limit',
      '1',
      '--json',
      'databaseId,status,conclusion,createdAt,url',
    ]);
    const [runInfo] = JSON.parse(list || '[]');
    if (runInfo && runInfo.createdAt >= startedAfter && runInfo.status === 'completed') {
      return runInfo;
    }
    console.log(`Waiting for workflow… (${i + 1}/90)`);
    await delay(20000);
  }
  throw new Error('Timed out waiting for desktop-releases workflow');
}

async function main() {
  if (!process.env.VPS_PASSWORD) {
    console.error('Set VPS_PASSWORD before running.');
    process.exit(1);
  }

  if (!hasWorkflowScope()) {
    console.error(
      [
        'Active GitHub account lacks `workflow` scope (required to push .github/workflows/*).',
        '',
        'Complete device login:',
        '  gh auth refresh -h github.com -s workflow',
        '  https://github.com/login/device',
        '',
        'Or set GH_TOKEN to a classic PAT with repo + workflow scopes, then re-run:',
        '  node deploy/complete-desktop-releases.mjs',
      ].join('\n'),
    );
    process.exit(1);
  }

  if (!existsSync(workflow)) {
    console.error('Missing workflow file:', workflow);
    process.exit(1);
  }

  console.log('Committing workflow fix (if needed)…');
  run('git', ['add', workflow]);
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root });
  if (diff.status !== 0) {
    run('git', [
      'commit',
      '-m',
      'Fix macOS desktop CI: native Tauri build and resilient publish job.',
    ]);
  }

  console.log('Pushing to origin/main…');
  gitPushMain();

  const startedAfter = new Date(Date.now() - 60_000).toISOString();
  console.log('Triggering desktop-releases workflow…');
  run('gh', ['workflow', 'run', 'desktop-releases.yml', '--repo', repo]);

  console.log('Waiting for workflow completion…');
  const runInfo = await waitForRun(startedAfter);
  console.log(`Workflow ${runInfo.conclusion}: ${runInfo.url}`);
  if (runInfo.conclusion !== 'success') {
    process.exit(1);
  }

  console.log('Verifying live releases API…');
  const res = await fetch('https://www.itestu.uz/api/v1/releases/desktop');
  const body = await res.json();
  const mac = body?.platforms?.macos;
  if (!mac?.url) {
    console.error('macOS release still missing:', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  const head = await fetch(mac.url, { method: 'HEAD' });
  if (!head.ok) {
    console.error('macOS download URL not reachable:', mac.url, head.status);
    process.exit(1);
  }

  console.log('All platforms live:');
  console.log(JSON.stringify(body.platforms, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
