#!/usr/bin/env npx tsx
/**
 * Lightweight load smoke for Phase G hardening.
 * Usage: cd api && npm run load:test
 *
 * Requires API running at API_URL (default http://localhost:3001/api/v1).
 */
import 'dotenv/config';

const API_URL = (process.env.API_URL ?? 'http://localhost:3001/api/v1').replace(
  /\/$/,
  '',
);
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 20);
const REQUESTS = Number(process.env.LOAD_TEST_REQUESTS ?? 200);

type Result = { ok: boolean; ms: number; status: number };

async function hit(path: string): Promise<Result> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_URL}${path}`);
    return {
      ok: res.ok,
      ms: performance.now() - start,
      status: res.status,
    };
  } catch {
    return { ok: false, ms: performance.now() - start, status: 0 };
  }
}

async function runBatch(path: string, count: number) {
  const results = await Promise.all(
    Array.from({ length: count }, () => hit(path)),
  );
  return results;
}

function summarize(label: string, results: Result[]) {
  const ok = results.filter((r) => r.ok).length;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;
  const avg = times.reduce((s, t) => s + t, 0) / (times.length || 1);
  console.log(
    `${label}: ${ok}/${results.length} ok · avg ${avg.toFixed(0)}ms · p95 ${p95.toFixed(0)}ms`,
  );
  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    const statuses = [...new Set(failures.map((f) => f.status))].join(', ');
    console.log(`  failures: ${failures.length} (statuses: ${statuses || 'network'})`);
  }
}

async function main() {
  console.log(`Load test → ${API_URL}`);
  console.log(`Concurrency ${CONCURRENCY}, ${REQUESTS} requests per endpoint\n`);

  const health: Result[] = [];
  const catalog: Result[] = [];

  for (let sent = 0; sent < REQUESTS; sent += CONCURRENCY) {
    const batch = Math.min(CONCURRENCY, REQUESTS - sent);
    const [h, c] = await Promise.all([
      runBatch('/health', batch),
      runBatch('/catalog/packages', batch),
    ]);
    health.push(...h);
    catalog.push(...c);
  }

  summarize('GET /health', health);
  summarize('GET /catalog/packages', catalog);

  const allOk = health.every((r) => r.ok) && catalog.every((r) => r.ok);
  if (!allOk) process.exit(1);
  console.log('\nLoad smoke passed.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
