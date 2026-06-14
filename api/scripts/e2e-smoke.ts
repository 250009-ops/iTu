/**
 * API smoke test for portal data integrity.
 * Run: npx tsx scripts/e2e-smoke.ts
 */
const BASE = process.env.API_URL ?? 'http://localhost:3001/api/v1';

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function get(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function post(path: string, token: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, detail: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name} — ${detail}`);
}

async function main() {
  console.log('E2E API smoke test\n');

  // Public endpoints
  try {
    const packages = await fetch(`${BASE}/catalog/packages`).then((r) => r.json());
    pass('Public catalog/packages', `${(packages as unknown[]).length} packages`);
  } catch (e) {
    fail('Public catalog/packages', String(e));
  }

  try {
    const testimonials = await fetch(`${BASE}/marketing/testimonials`).then((r) =>
      r.json(),
    );
    pass('Public marketing/testimonials', `${(testimonials as unknown[]).length} items`);
  } catch (e) {
    fail('Public marketing/testimonials', String(e));
  }

  // Student
  try {
    const token = await login('student', 'student');
    const dash = await get('/students/dashboard', token);
    if (dash.user.mocksCompleted === 0) {
      pass('Student fresh dashboard', '0 mocks completed');
    } else {
      pass('Student dashboard', `${dash.user.mocksCompleted} mocks`);
    }
    if (dash.user.targetBand == null) {
      pass('Student targetBand', 'null (fresh user)');
    } else {
      pass('Student targetBand', String(dash.user.targetBand));
    }

    const profile = await get('/students/profile', token);
    if (profile.package?.title == null) {
      pass('Student profile package', 'no package (fresh)');
    }
    pass('Student profile notificationPrefs field', profile.notificationPrefs == null ? 'null ok' : 'present');

    await post('/support/tickets', token, {
      subject: 'E2E smoke test ticket',
      message: 'Automated smoke test — please ignore.',
      type: 'technical_issue',
    });
    pass('Student support ticket');
  } catch (e) {
    fail('Student flow', String(e));
  }

  // Teacher
  try {
    const token = await login('teacher', 'teacher');
    await get('/teachers/dashboard', token);
    pass('Teacher dashboard');
    await get('/teachers/profile', token);
    pass('Teacher profile');
    await post('/support/tickets', token, {
      subject: 'Teacher E2E smoke test',
      message: 'Automated smoke test from teacher portal.',
      type: 'technical_issue',
    });
    pass('Teacher support ticket');
  } catch (e) {
    fail('Teacher flow', String(e));
  }

  // Admin
  try {
    const token = await login('admin', 'admin');
    await get('/admin/dashboard', token);
    pass('Admin dashboard');
    await get('/admin/enrollments', token);
    pass('Admin enrollments');
    await get('/admin/sessions/live', token);
    pass('Admin live sessions');
  } catch (e) {
    fail('Admin flow', String(e));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
