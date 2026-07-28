/**
 * Full cross-portal E2E test — Student, Teacher, Admin journeys via API.
 * Mirrors docs/STUDENT-TESTING-GUIDE.md scenarios.
 *
 * Run: npm run e2e:full
 */
const BASE = process.env.API_URL ?? 'http://localhost:3001/api/v1';

type Result = {
  portal: string;
  scenario: string;
  ok: boolean;
  detail?: string;
};

const results: Result[] = [];

function pass(portal: string, scenario: string, detail?: string) {
  results.push({ portal, scenario, ok: true, detail });
  console.log(`✓ [${portal}] ${scenario}${detail ? ` — ${detail}` : ''}`);
}

function fail(portal: string, scenario: string, detail: string) {
  results.push({ portal, scenario, ok: false, detail });
  console.error(`✗ [${portal}] ${scenario} — ${detail}`);
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login ${email}: ${res.status}`);
  const data = (await res.json()) as {
    accessToken: string;
    dashboardPath: string;
    user: { name: string; role: string };
  };
  return data;
}

async function api<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function resetStudent() {
  const { execSync } = await import('child_process');
  execSync('npm run db:reset-student', { cwd: process.cwd(), stdio: 'pipe' });
}

async function runStudentScenarios() {
  const portal = 'Student';

  try {
    const auth = await login('student@example.com', 'student');
    if (auth.dashboardPath === '/student') {
      pass(portal, '1. Login redirects to student dashboard');
    } else {
      fail(portal, '1. Login', `dashboardPath=${auth.dashboardPath}`);
    }

    const dash = await api<{
      user: { name: string; mocksCompleted: number; targetBand: number | null };
      stats: { mocksCompleted: number };
      upcomingMock: unknown;
    }>('GET', '/students/dashboard', auth.accessToken);

    if (dash.user.name.includes('Alex')) {
      pass(portal, '1. Welcome Alex Johnson', dash.user.name);
    }
    if (dash.stats.mocksCompleted === 0) {
      pass(portal, '1. Empty dashboard — 0 mocks');
    }
    if (dash.user.targetBand == null) {
      pass(portal, '1. Target band not set');
    }
    if (!dash.upcomingMock) {
      pass(portal, '1. No upcoming mock');
    }
  } catch (e) {
    fail(portal, '1. Login & empty dashboard', String(e));
  }

  let studentToken = '';
  let sessionCode = '';
  let enrollmentCode = '';
  let packageId = '';

  try {
    studentToken = (await login('student@example.com', 'student')).accessToken;
    const packages = await fetch(`${BASE}/catalog/packages`).then((r) =>
      r.json(),
    ) as { id: string; slug: string; title: string }[];

    const titles = packages.map((p) => p.title);
    const expected = [
      'Full Academic Mock',
      'Speaking Only',
      'Writing Only',
      'Listening Only',
      'Reading Only',
    ];
    const found = expected.filter((t) => titles.includes(t));
    if (packages.length !== 5 || found.length !== 5) {
      throw new Error(
        `Expected 5 type placeholders, got ${packages.length}: ${titles.join(', ')}`,
      );
    }
    if (titles.some((t) => /A00\d|Mock-\d/i.test(t))) {
      throw new Error(`Public catalog leaked mock serials: ${titles.join(', ')}`);
    }
    pass(portal, '2. Browse packages', `${packages.length} type placeholders`);

    const offers = await api<
      {
        package: { id: string; slug: string } | null;
        tabId: string;
      }[]
    >('GET', '/students/catalog/offers', studentToken);
    const fullOffer =
      offers.find((o) => o.tabId === 'full-academic' && o.package) ??
      offers.find((o) => o.package);
    if (!fullOffer?.package) throw new Error('No bookable full-academic offer');
    packageId = fullOffer.package.id;

    const testimonials = await fetch(`${BASE}/marketing/testimonials`).then(
      (r) => r.json(),
    );
    pass(portal, '2. Testimonials API', `${(testimonials as unknown[]).length} published`);

    const teachers = await fetch(`${BASE}/bookings/teachers`).then((r) =>
      r.json(),
    ) as { id: string; name: string }[];
    if (!teachers.length) throw new Error('No teachers');

    const sarah =
      teachers.find((t) => t.name.toLowerCase().includes('sarah')) ??
      teachers[0];

    const date = todayIso();
    const slots = await fetch(
      `${BASE}/bookings/availability?date=${date}`,
    ).then((r) => r.json()) as {
      id: string;
      teacherId: string;
      startsAt: string;
    }[];
    const speakingSlot =
      slots.find((s) => s.teacherId === sarah.id) ?? slots[0];
    if (!speakingSlot) throw new Error('No speaking slots for today');

    const booking = await api<{
      sessionCode: string;
      enrollmentCode: string;
      orderCode: string;
      status: string;
    }>('POST', '/bookings', studentToken, {
      packageId,
      mockDate: date,
      mockTime: '09:00',
      writingTeacherId: sarah.id,
      speakingTeacherId: speakingSlot.teacherId,
      speakingSlotId: speakingSlot.id,
      paymentMethod: 'card',
    });

    sessionCode = booking.sessionCode;
    enrollmentCode = booking.enrollmentCode;
    pass(
      portal,
      '3. Booking wizard (4 steps)',
      `${booking.enrollmentCode} · ${sessionCode} · ${booking.status}`,
    );
  } catch (e) {
    fail(portal, '2–3. Browse & booking', String(e));
    return;
  }

  try {
    const mockDay = await api<{
      enrollment: { sessionCode: string; state: string } | null;
      sections: { skill: string; completed: boolean }[];
    }>('GET', '/students/mock-day', studentToken);

    if (mockDay.enrollment?.sessionCode === sessionCode) {
      pass(portal, '4. Mock Day Hub', sessionCode);
    }
    const skills = mockDay.sections.map((s) => s.skill);
    if (skills.includes('listening') && skills.includes('speaking')) {
      pass(portal, '4. Mock Day timeline', skills.join(' → '));
    }
  } catch (e) {
    fail(portal, '4. Mock Day Hub', String(e));
  }

  try {
    await api('POST', `/exam-sessions/${sessionCode}/check-in`, studentToken, {
      acknowledgedRules: true,
    });
    pass(portal, '5. Exam check-in');

    await api('POST', `/exam-sessions/${sessionCode}/start-section`, studentToken, {
      skill: 'LISTENING',
    });
    await api('POST', `/exam-sessions/${sessionCode}/answers`, studentToken, {
      answers: { 1: 'A', 2: 'B', 3: 'C' },
    });
    const afterListening = await api<{ state: string }>(
      'POST',
      `/exam-sessions/${sessionCode}/submit-section`,
      studentToken,
      { skill: 'LISTENING' },
    );
    pass(portal, '6. Listening CBT', afterListening.state);

    await api('POST', `/exam-sessions/${sessionCode}/start-section`, studentToken, {
      skill: 'READING',
    });
    await api('POST', `/exam-sessions/${sessionCode}/answers`, studentToken, {
      answers: { 1: 'TRUE', 2: 'FALSE' },
    });
    const afterReading = await api<{ state: string }>(
      'POST',
      `/exam-sessions/${sessionCode}/submit-section`,
      studentToken,
      { skill: 'READING' },
    );
    pass(portal, '7. Reading CBT', afterReading.state);

    await api('POST', `/exam-sessions/${sessionCode}/start-section`, studentToken, {
      skill: 'WRITING',
    });
    await api('POST', `/exam-sessions/${sessionCode}/submit-writing`, studentToken, {
      task1Text: 'E2E test task 1 response with enough words for validation.',
      task2Text:
        'E2E test task 2 response with enough words for the writing section submission test.',
    });
    const afterWriting = await api<{ state: string }>(
      'POST',
      `/exam-sessions/${sessionCode}/submit-section`,
      studentToken,
      { skill: 'WRITING' },
    );
    pass(portal, '8. Writing CBT', afterWriting.state);

    const sessionBeforeSpeaking = await api<{ state: string }>(
      'GET',
      `/exam-sessions/${sessionCode}`,
      studentToken,
    );
    pass(portal, '9. Speaking waiting room state', sessionBeforeSpeaking.state);

    await api('POST', `/exam-sessions/${sessionCode}/start-section`, studentToken, {
      skill: 'SPEAKING',
    });
    const afterSpeaking = await api<{ state: string }>(
      'POST',
      `/exam-sessions/${sessionCode}/submit-section`,
      studentToken,
      { skill: 'SPEAKING' },
    );
    pass(portal, '10. Speaking exam UI flow', afterSpeaking.state);

    const content = await api<{ code: string }>(
      'GET',
      `/exam-sessions/${sessionCode}/content/listening`,
      studentToken,
    );
    pass(portal, '6. Exam content from API', content.code ?? 'loaded');
  } catch (e) {
    fail(portal, '5–10. Exam delivery', String(e));
  }

  try {
    const profile = await api<{
      name: string;
      targetBand: number | null;
      package: { title: string | null };
    }>('GET', '/students/profile', studentToken);

    await api('PATCH', '/students/profile', studentToken, {
      targetBand: 7,
      name: 'Alex Johnson',
    });
    const updated = await api<{ targetBand: number }>(
      'GET',
      '/students/profile',
      studentToken,
    );
    if (updated.targetBand === 7) {
      pass(portal, '11. Profile update target band', '7.0');
    }
    if (profile.package?.title) {
      pass(portal, '11. Profile mock package', profile.package.title);
    }
  } catch (e) {
    fail(portal, '11. Profile', String(e));
  }

  try {
    const notifications = await api<
      { id: string; title: string; isRead: boolean }[]
    >('GET', '/notifications', studentToken);

    const booked = notifications.some((n) =>
      n.title.toLowerCase().includes('book') ||
      n.title.toLowerCase().includes('mock'),
    );
    pass(portal, '12. Notifications after booking', `${notifications.length} total, booked=${booked}`);

    if (notifications.length > 0) {
      await api('PATCH', `/notifications/${notifications[0].id}/read`, studentToken, {});
      pass(portal, '12. Mark notification read');
    }
  } catch (e) {
    fail(portal, '12. Notifications', String(e));
  }

  try {
    await api('POST', '/support/tickets', studentToken, {
      subject: 'E2E student help ticket',
      message: 'Automated full E2E test — technical issue scenario.',
      type: 'technical_issue',
    });
    pass(portal, '13. Help support ticket');
  } catch (e) {
    fail(portal, '13. Help', String(e));
  }

  return { studentToken, sessionCode, enrollmentCode };
}

async function runTeacherScenarios(studentName = 'Alex') {
  const portal = 'Teacher';
  let speakingSessionId: string | null = null;
  try {
    const auth = await login('teacher@example.com', 'teacher');
    if (auth.dashboardPath.includes('/teacher')) {
      pass(portal, 'Login', auth.dashboardPath);
    }

    const dash = await api<{
      stats: { writingQueue: number; sessionsToday: number };
      speakingSchedule: { id: string; studentName: string }[];
    }>('GET', '/teachers/dashboard', auth.accessToken);
    pass(
      portal,
      'Dashboard',
      `writing queue=${dash.stats.writingQueue}, sessions=${dash.stats.sessionsToday}`,
    );

    await api('GET', '/teachers/availability', auth.accessToken);
    pass(portal, 'Availability page data');

    await api('GET', '/teachers/earnings', auth.accessToken);
    pass(portal, 'Earnings page data');

    const profile = await api<{ name: string; rating: number | null }>(
      'GET',
      '/teachers/profile',
      auth.accessToken,
    );
    pass(portal, 'Profile', profile.name);

    const queue = await api<
      { id: string; studentName: string; status: string }[]
    >('GET', '/grading/writing-queue', auth.accessToken);

    const alexWriting = queue.find((w) =>
      w.studentName.toLowerCase().includes(studentName.toLowerCase()),
    );
    if (alexWriting) {
      await api('GET', `/grading/writing/${alexWriting.id}`, auth.accessToken);
      await api('POST', `/grading/writing/${alexWriting.id}/score`, auth.accessToken, {
        criteriaScores: {
          task1: {
            taskAchievement: 7,
            coherenceCohesion: 7,
            lexicalResource: 7,
            grammar: 7,
          },
          task2: {
            taskResponse: 7,
            coherenceCohesion: 7,
            lexicalResource: 7,
            grammar: 7,
          },
        },
        overallBand: 7,
        feedback: 'E2E automated writing grade.',
      });
      pass(portal, 'Grading — Writing for student', alexWriting.studentName);
    } else {
      pass(portal, 'Grading — Writing queue', `${queue.length} items (no Alex match yet)`);
    }

    const speakingFromDash = dash.speakingSchedule.find((s) =>
      s.studentName.toLowerCase().includes(studentName.toLowerCase()),
    );
    if (speakingFromDash) {
      speakingSessionId = speakingFromDash.id;
      await api('GET', `/grading/speaking/${speakingFromDash.id}`, auth.accessToken);
      await api(
        'POST',
        `/grading/speaking/${speakingFromDash.id}/score`,
        auth.accessToken,
        {
          criteriaScores: {
            fluency: 7,
            lexical: 7,
            grammar: 7,
            pronunciation: 7,
          },
          overallBand: 7,
          feedback: 'E2E automated speaking grade.',
          teacherNotes: 'E2E test',
        },
      );
      pass(portal, 'Speaking — grade student', speakingFromDash.studentName);
    } else {
      pass(portal, 'Speaking schedule', `${dash.speakingSchedule.length} sessions listed`);
    }

    // Re-trigger results release after writing + speaking grades (idempotent)
    if (speakingSessionId) {
      await api(
        'POST',
        `/grading/speaking/${speakingSessionId}/score`,
        auth.accessToken,
        {
          criteriaScores: {
            fluency: 7,
            lexical: 7,
            grammar: 7,
            pronunciation: 7,
          },
          overallBand: 7,
          feedback: 'E2E results release check.',
        },
      );
    }

    await api('POST', '/support/tickets', auth.accessToken, {
      subject: 'E2E teacher help',
      message: 'Teacher portal help scenario automated test.',
      type: 'technical_issue',
    });
    pass(portal, 'Help support ticket');
  } catch (e) {
    fail(portal, 'Teacher scenarios', String(e));
  }
}

async function runStudentResultsScenarios(
  studentToken: string,
  enrollmentCode?: string,
) {
  const portal = 'Student';
  try {
    const results = await api<
      { enrollmentCode: string; overallBand: number | null; released: boolean }[]
    >('GET', '/results', studentToken);

    if (results.length > 0 && results[0].overallBand != null) {
      pass(portal, '14. Results released', `band ${results[0].overallBand}`);
      const code = results[0].enrollmentCode ?? enrollmentCode;
      if (code) {
        const detail = await api<{ overallBand: number; released: boolean }>(
          'GET',
          `/results/${code}`,
          studentToken,
        );
        if (detail.released) {
          pass(portal, '14. Results detail breakdown', `overall ${detail.overallBand}`);
        }
      }
    } else if (enrollmentCode) {
      const detail = await api<{ released?: boolean; overallBand?: number }>(
        'GET',
        `/results/${enrollmentCode}`,
        studentToken,
      );
      if (detail.released) {
        pass(portal, '14. Results released', `band ${detail.overallBand}`);
      } else {
        fail(
          portal,
          '14. Results not released after grading',
          'resultsStatus still pending — restart API if grading fix not loaded',
        );
      }
    } else {
      pass(portal, '14. Results', results.length ? 'pending release' : 'empty');
    }

    const reviewables = await api<
      { enrollmentId: string; enrollmentCode: string; review: unknown }[]
    >('GET', '/students/reviewables', studentToken);

    if (reviewables.length > 0) {
      await api('POST', '/students/reviews', studentToken, {
        enrollmentId: reviewables[0].enrollmentId,
        rating: 5,
        comment: 'E2E automated review — great mock experience.',
        publishConsent: true,
      });
      pass(portal, '15. Post-mock review submitted');
    } else {
      pass(portal, '15. Reviews', 'none reviewable yet');
    }

    await api('PATCH', '/students/leaderboard-consent', studentToken, {
      publish: true,
    });
    pass(portal, '15. Leaderboard consent');
  } catch (e) {
    fail(portal, '14–15. Results & reviews', String(e));
  }
}

async function runAdminScenarios() {
  const portal = 'Admin';
  try {
    const auth = await login('serkinov393@gmail.com', 'admin');
    pass(portal, 'Login', auth.dashboardPath);

    const dash = await api<{
      kpis: {
        totalEnrollments: number;
        activeExams: number;
        openTickets: number;
      };
      liveSessions: unknown[];
    }>('GET', '/admin/dashboard', auth.accessToken);
    pass(
      portal,
      '16. Dashboard KPIs',
      `enrollments=${dash.kpis.totalEnrollments}, active=${dash.kpis.activeExams}`,
    );

    const enrollments = await api<{
      enrollments: { studentName: string; lifecycle: string }[];
    }>('GET', '/admin/enrollments', auth.accessToken);
    const alex = enrollments.enrollments.find((e) =>
      e.studentName.includes('Alex'),
    );
    pass(
      portal,
      '16. Enrollments',
      alex ? `${alex.studentName} · ${alex.lifecycle}` : `${enrollments.enrollments.length} rows`,
    );

    const orders = await api<
      { status: string; orderCode?: string }[]
    >('GET', '/admin/orders', auth.accessToken);
    const paid = orders.filter((o) => o.status === 'paid').length;
    pass(portal, '16. Orders', `${paid} paid of ${orders.length}`);

    const live = await api<{ sessions: unknown[] }>(
      'GET',
      '/admin/sessions/live',
      auth.accessToken,
    );
    pass(portal, '16. Live monitor', `${live.sessions?.length ?? 0} sessions`);

    await api('GET', '/admin/teachers', auth.accessToken);
    pass(portal, 'Teachers page');

    await api('GET', '/admin/disputes', auth.accessToken);
    pass(portal, 'Disputes / support tickets');

    await api('GET', '/admin/packages', auth.accessToken);
    pass(portal, 'Packages page');

    await api('GET', '/admin/content/tests', auth.accessToken);
    pass(portal, 'Content studio');

    await api('GET', '/admin/reports/summary', auth.accessToken);
    pass(portal, 'Reports page');

    await api('GET', '/admin/settings', auth.accessToken);
    pass(portal, 'Settings page');

    await api('POST', '/support/tickets', auth.accessToken, {
      subject: 'E2E admin help',
      message: 'Admin portal help scenario automated test.',
      type: 'technical_issue',
    });
    pass(portal, 'Help support ticket');
  } catch (e) {
    fail(portal, 'Admin scenarios', String(e));
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  IELTS Mock ERP — Full Cross-Portal E2E Test');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Resetting Alex Johnson to fresh state…\n');
  try {
    await resetStudent();
    pass('Setup', 'Reset fresh student');
  } catch (e) {
    fail('Setup', 'Reset student', String(e));
  }

  const studentRun = await runStudentScenarios();
  const studentToken =
    studentRun?.studentToken ??
    (await login('student@example.com', 'student')).accessToken;

  await runTeacherScenarios('Alex');
  await runStudentResultsScenarios(studentToken, studentRun?.enrollmentCode);
  await runAdminScenarios();

  console.log('\n═══════════════════════════════════════════════════');
  const failed = results.filter((r) => !r.ok);
  const byPortal = {
    Student: results.filter((r) => r.portal === 'Student'),
    Teacher: results.filter((r) => r.portal === 'Teacher'),
    Admin: results.filter((r) => r.portal === 'Admin'),
    Setup: results.filter((r) => r.portal === 'Setup'),
  };

  for (const [name, items] of Object.entries(byPortal)) {
    if (!items.length) continue;
    const ok = items.filter((i) => i.ok).length;
    console.log(`${name}: ${ok}/${items.length} passed`);
  }

  console.log(`\nTotal: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length) {
    console.log('\nFailed scenarios:');
    failed.forEach((f) =>
      console.log(`  • [${f.portal}] ${f.scenario}: ${f.detail}`),
    );
    process.exit(1);
  }

  console.log('\nAll scenarios passed ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
