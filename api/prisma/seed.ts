import {
  ContentTestStatus,
  ContentTestType,
  EnrollmentStatus,
  ExamSessionState,
  ExamSkill,
  ExamType,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PayoutStatus,
  PrismaClient,
  SlotStatus,
  TeacherSpeciality,
  TeacherStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

function loadExamJson(filename: string): object {
  const filePath = path.join(__dirname, 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as object;
}

function loadAnswerKey(filename: string): Record<string, string | string[]> {
  const filePath = path.join(__dirname, 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<
    string,
    string | string[]
  >;
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.$transaction([
    prisma.answer.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.writingSubmission.deleteMany(),
    prisma.speakingSession.deleteMany(),
    prisma.sectionAttempt.deleteMany(),
    prisma.examSession.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.order.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.teacherSlot.deleteMany(),
    prisma.teacherAvailability.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.mockTestPackage.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.contentTest.deleteMany(),
    prisma.bandConversionTable.deleteMany(),
    prisma.platformSettings.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.teacherProfile.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('student', 12);
  const teacherHash = await bcrypt.hash('teacher', 12);
  const adminHash = await bcrypt.hash('admin', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin',
      name: 'System Admin',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: 'teacher',
      name: 'Dr. Sarah Chen',
      passwordHash: teacherHash,
      role: UserRole.TEACHER,
      teacherProfile: {
        create: {
          slug: 'sarah-chen',
          bio: 'Cambridge-certified IELTS specialist with a PhD in Applied English. Expert in Task 1 data interpretation and Task 2 argument construction.',
          longBio:
            'Dr. Sarah Chen brings a research-led approach to IELTS Writing and Speaking assessment. With a PhD in Applied English and over a decade of teaching at university level, she specialises in the analytical rigour required for Band 8+ responses. Her feedback pinpoints exactly where lexical and grammatical range can be elevated.',
          credentials: ['CELTA', 'DELTA', 'IELTS Examiner Certification'],
          languages: ['English', 'Mandarin'],
          status: TeacherStatus.APPROVED,
          speciality: TeacherSpeciality.BOTH,
          rating: 4.9,
          reviewCount: 940,
          isTopRated: true,
          totalSessions: 342,
          totalEarned: 12450,
          commissionRate: 0.75,
        },
      },
    },
    include: { teacherProfile: true },
  });

  const writingTeacher = await prisma.user.create({
    data: {
      email: 'emma.williams@example.com',
      name: 'Emma Williams',
      passwordHash: teacherHash,
      role: UserRole.TEACHER,
      teacherProfile: {
        create: {
          slug: 'emma-williams',
          bio: 'Academic writing specialist focused on Task 1 coherence and Task 2 argumentation, with criteria-level feedback.',
          longBio:
            'Emma is a multi-skilled examiner specialising in Academic writing assessment and holistic band scoring. She is particularly skilled at helping candidates master the cohesion and collocation expected at Band 7+.',
          credentials: ['CELTA', 'MA TESOL'],
          languages: ['English', 'French'],
          status: TeacherStatus.APPROVED,
          speciality: TeacherSpeciality.WRITING,
          rating: 4.8,
          reviewCount: 620,
          isTopRated: false,
          totalSessions: 210,
          totalEarned: 8750,
        },
      },
    },
    include: { teacherProfile: true },
  });

  const danielUser = await prisma.user.create({
    data: {
      email: 'daniel.whitfield@example.com',
      name: 'Daniel Whitfield',
      passwordHash: teacherHash,
      role: UserRole.TEACHER,
      teacherProfile: {
        create: {
          slug: 'daniel-whitfield',
          bio: 'Former IDP examiner with 12 years coaching Band 8+ writing and speaking. Delivers precise criteria-level feedback.',
          longBio:
            'Daniel spent 8 years as a practising IDP IELTS examiner before transitioning to specialist coaching. He holds an MA in Applied Linguistics and a CELTA qualification. His candidates consistently report score improvements of 1+ band within two attempts.',
          credentials: ['CELTA', 'Ex-IDP Examiner', 'MA Applied Linguistics'],
          languages: ['English', 'Arabic'],
          status: TeacherStatus.APPROVED,
          speciality: TeacherSpeciality.BOTH,
          rating: 4.9,
          reviewCount: 1240,
          isTopRated: true,
          totalSessions: 1280,
          totalEarned: 41200,
        },
      },
    },
    include: { teacherProfile: true },
  });

  const michaelUser = await prisma.user.create({
    data: {
      email: 'michael.torres@example.com',
      name: 'Michael Torres',
      passwordHash: teacherHash,
      role: UserRole.TEACHER,
      teacherProfile: {
        create: {
          slug: 'michael-torres',
          bio: 'Licensed IELTS Speaking examiner. Creates a natural, low-pressure environment where candidates perform to their true potential.',
          longBio:
            'Michael is a licensed IELTS Speaking examiner who has assessed thousands of candidates. His sessions feel like a genuine conversation, which puts nervous candidates at ease and produces a more representative fluency score.',
          credentials: ['Licensed IELTS Examiner', 'CELTA', 'BA Linguistics'],
          languages: ['English', 'Spanish'],
          status: TeacherStatus.APPROVED,
          speciality: TeacherSpeciality.SPEAKING,
          rating: 4.8,
          reviewCount: 760,
          isTopRated: false,
          totalSessions: 760,
          totalEarned: 24800,
        },
      },
    },
    include: { teacherProfile: true },
  });

  const studentUser = await prisma.user.create({
    data: {
      email: 'student',
      name: 'Alex Johnson',
      passwordHash,
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          targetBand: null,
          examType: ExamType.ACADEMIC,
          country: 'UK',
        },
      },
    },
    include: { studentProfile: true },
  });

  const listeningTest = await prisma.contentTest.create({
    data: {
      code: 'LIS-ACAD-005',
      title: 'Listening — Academic Mock 005',
      type: ContentTestType.LISTENING,
      status: ContentTestStatus.PUBLISHED,
      durationMin: 32,
      publishedAt: new Date(),
      content: loadExamJson('listening.json'),
      answerKey: loadAnswerKey('listening-answer-key.json'),
    },
  });

  const listeningAudioUrls = [
    'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
    'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
  ];
  await prisma.mediaAsset.createMany({
    data: listeningAudioUrls.map((url, i) => ({
      testId: listeningTest.id,
      key: `part-${i + 1}`,
      url,
      mimeType: 'audio/ogg',
    })),
  });

  const readingTest = await prisma.contentTest.create({
    data: {
      code: 'REA-ACAD-005',
      title: 'Reading — Academic Mock 005',
      type: ContentTestType.READING,
      status: ContentTestStatus.PUBLISHED,
      durationMin: 60,
      publishedAt: new Date(),
      content: loadExamJson('reading.json'),
      answerKey: loadAnswerKey('reading-answer-key.json'),
    },
  });

  const writingTest = await prisma.contentTest.create({
    data: {
      code: 'WRI-ACAD-005',
      title: 'Writing — Academic Mock 005',
      type: ContentTestType.WRITING,
      status: ContentTestStatus.PUBLISHED,
      durationMin: 60,
      publishedAt: new Date(),
      content: loadExamJson('writing.json'),
    },
  });

  const speakingBank = await prisma.contentTest.create({
    data: {
      code: 'SPK-BANK-005',
      title: 'Speaking Bank 005',
      type: ContentTestType.SPEAKING,
      status: ContentTestStatus.PUBLISHED,
      durationMin: 15,
      publishedAt: new Date(),
      content: loadExamJson('speaking.json'),
    },
  });

  const mockPackage = await prisma.mockTestPackage.create({
    data: {
      slug: 'full-academic-mock',
      title: 'Full Academic Mock',
      description:
        'All four skills in one day. IELTS Academic — for university, visa, and professional registration.',
      price: 49.0,
      currency: 'USD',
      examType: ExamType.ACADEMIC,
      mostPopular: true,
      rating: 4.9,
      reviewCount: 1240,
      skills: ['listening', 'reading', 'writing', 'speaking'],
      included: [
        'Pick your certified examiner',
        'Full band report within 24 hours',
        'Criteria-level written feedback',
        'Score progression tracking',
        'Secure exam environment',
      ],
      rules: [
        'No pause or rewind',
        'Server-authoritative timers',
        'Strict exam-day integrity',
        'All scores released together',
      ],
      listeningTestId: listeningTest.id,
      readingTestId: readingTest.id,
      writingTestId: writingTest.id,
      speakingBankId: speakingBank.id,
    },
  });

  await prisma.mockTestPackage.createMany({
    data: [
      {
        slug: 'general-training-mock',
        title: 'General Training Mock',
        description:
          'All four skills. IELTS General Training — for migration, permanent residency, and work programs.',
        price: 45.0,
        currency: 'USD',
        examType: ExamType.GENERAL_TRAINING,
        mostPopular: false,
        rating: 4.8,
        reviewCount: 680,
        skills: ['listening', 'reading', 'writing', 'speaking'],
        included: [
          'Pick your certified examiner',
          'Full band report within 24 hours',
          'Criteria-level written feedback',
          'Score progression tracking',
          'Secure exam environment',
        ],
        rules: [
          'No pause or rewind',
          'Server-authoritative timers',
          'Strict exam-day integrity',
          'All scores released together',
        ],
      },
      {
        slug: 'speaking-only',
        title: 'Speaking Only',
        description:
          'A single live Speaking session with a certified examiner, with criteria-level feedback.',
        price: 22.0,
        currency: 'USD',
        examType: ExamType.ACADEMIC,
        mostPopular: false,
        rating: 4.9,
        reviewCount: 430,
        skills: ['speaking'],
        included: [
          'Pick your certified examiner',
          'Speaking score within 24 hours',
          'Criteria-level speaking feedback',
          'Part 1, 2 & 3 transcript notes',
        ],
        rules: ['Live video session', '11–14 minutes', 'Recorded for examiner reference'],
      },
      {
        slug: 'writing-only',
        title: 'Writing Only',
        description:
          'Task 1 + Task 2 graded by a certified examiner with full criteria-level written feedback.',
        price: 18.0,
        currency: 'USD',
        examType: ExamType.ACADEMIC,
        mostPopular: false,
        rating: 4.8,
        reviewCount: 320,
        skills: ['writing'],
        included: [
          'Expert examiner grading',
          'Task 1 + Task 2 feedback',
          'Criteria-level breakdown',
          'Turnaround within 24 hours',
        ],
        rules: ['60-minute window', 'Live word counter', 'Spell-check disabled'],
      },
    ],
  });

  await prisma.mockTestPackage.updateMany({
    where: { slug: 'general-training-mock' },
    data: {
      listeningTestId: listeningTest.id,
      readingTestId: readingTest.id,
      writingTestId: writingTest.id,
      speakingBankId: speakingBank.id,
    },
  });

  await prisma.mockTestPackage.updateMany({
    where: { slug: 'speaking-only' },
    data: { speakingBankId: speakingBank.id },
  });

  await prisma.mockTestPackage.updateMany({
    where: { slug: 'writing-only' },
    data: { writingTestId: writingTest.id },
  });

  await seedBandTables();

  await seedPayouts([
    teacherUser.teacherProfile!.id,
    writingTeacher.teacherProfile!.id,
    danielUser.teacherProfile!.id,
  ]);

  await prisma.teacherSlot.create({
    data: {
      teacherId: teacherUser.teacherProfile!.id,
      startsAt: new Date('2026-06-14T14:00:00Z'),
      endsAt: new Date('2026-06-14T14:30:00Z'),
      status: SlotStatus.AVAILABLE,
    },
  });

  await prisma.teacherSlot.createMany({
    data: [
      {
        teacherId: teacherUser.teacherProfile!.id,
        startsAt: new Date('2026-06-15T10:00:00Z'),
        endsAt: new Date('2026-06-15T10:30:00Z'),
        status: SlotStatus.AVAILABLE,
      },
      {
        teacherId: teacherUser.teacherProfile!.id,
        startsAt: new Date('2026-06-15T11:00:00Z'),
        endsAt: new Date('2026-06-15T11:30:00Z'),
        status: SlotStatus.AVAILABLE,
      },
    ],
  });

  // Rolling availability so the booking wizard has open slots on upcoming days.
  const speakingTeacherIds = [
    teacherUser.teacherProfile!.id,
    danielUser.teacherProfile!.id,
    michaelUser.teacherProfile!.id,
  ];
  const rollingSlots: {
    teacherId: string;
    startsAt: Date;
    endsAt: Date;
    status: SlotStatus;
  }[] = [];
  // Avoid 14:00 which collides with the fixed booked slot above.
  const slotHours = [15, 16, 17, 18];
  const baseDay = new Date();
  baseDay.setHours(0, 0, 0, 0);
  for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
    for (let teacherIndex = 0; teacherIndex < speakingTeacherIds.length; teacherIndex += 1) {
      const teacherId = speakingTeacherIds[teacherIndex];
      // Stagger which hours each teacher offers so the grid looks realistic.
      const hours = slotHours.filter(
        (_, i) => (i + teacherIndex + dayOffset) % 2 === 0,
      );
      for (const hour of hours) {
        const startsAt = new Date(baseDay);
        startsAt.setDate(baseDay.getDate() + dayOffset);
        // Use a :20 offset so generated slots never collide with the
        // fixed on-the-hour seeded slots regardless of server timezone.
        startsAt.setHours(hour, 20, 0, 0);
        const endsAt = new Date(startsAt);
        endsAt.setHours(hour, 50, 0, 0);
        rollingSlots.push({
          teacherId,
          startsAt,
          endsAt,
          status: SlotStatus.AVAILABLE,
        });
      }
    }
  }
  await prisma.teacherSlot.createMany({ data: rollingSlots });

  // Alex Johnson (student/student) is seeded as a fresh user — no bookings yet.
  // Use the booking wizard to test the full student journey from scratch.

  await prisma.notification.createMany({
    data: [
      {
        userId: teacherUser.id,
        type: NotificationType.INFO,
        title: 'Availability updated',
        body: 'Your speaking slots for the next two weeks are open for booking.',
        link: '/teacher/availability',
      },
      {
        userId: admin.id,
        type: NotificationType.SYSTEM,
        title: 'Platform healthy',
        body: 'All systems operational.',
      },
    ],
  });

  await prisma.platformSettings.createMany({
    data: [
      {
        section: 'general',
        settings: {
          platformName: 'IELTS Mock ERP',
          supportEmail: 'support@itestu.uz',
          timezone: 'UTC',
        },
      },
      {
        section: 'examTimers',
        settings: { listening: 40, reading: 60, writing: 60, speaking: 15 },
      },
      {
        section: 'commission',
        settings: {
          platformRate: 0.25,
          speakingFee: 25,
          writingFee: 35,
        },
      },
    ],
  });

  await seedLeaderboardStudents(mockPackage.id, {
    writing: writingTeacher.teacherProfile!.id,
    speaking: michaelUser.teacherProfile!.id,
    both: danielUser.teacherProfile!.id,
  });

  console.log('Seed complete.');
  console.log('Demo accounts: student/student, teacher/teacher, admin/admin');
  console.log('Fresh student: Alex Johnson — book a mock via Browse Mocks');
  console.log('Reset Alex anytime: npm run db:reset-student');
}

interface LeaderboardSeed {
  name: string;
  email: string;
  country: string;
  bands: { listening: number; reading: number; writing: number; speaking: number };
  rating: number;
  comment: string;
  publish: boolean;
}

const LEADERBOARD_SEED: LeaderboardSeed[] = [
  {
    name: 'Aisha Karimova',
    email: 'aisha.karimova@example.com',
    country: 'UZ',
    bands: { listening: 9, reading: 8.5, writing: 8, speaking: 8.5 },
    rating: 5,
    comment:
      'Felt exactly like the real IDP test. The examiner feedback on my writing was gold — I nailed it on the actual exam two weeks later.',
    publish: true,
  },
  {
    name: 'Lucas Brennan',
    email: 'lucas.brennan@example.com',
    country: 'AU',
    bands: { listening: 8.5, reading: 8, writing: 7.5, speaking: 8 },
    rating: 5,
    comment:
      'Same-day results was a game changer. Booked my real IELTS the next morning with total confidence.',
    publish: true,
  },
  {
    name: 'Mei Tanaka',
    email: 'mei.tanaka@example.com',
    country: 'JP',
    bands: { listening: 8, reading: 8, writing: 7.5, speaking: 8.5 },
    rating: 5,
    comment:
      'Smooth, realistic, professional. The listening audio was indistinguishable from the real test.',
    publish: true,
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@example.com',
    country: 'MX',
    bands: { listening: 7.5, reading: 8, writing: 7, speaking: 7.5 },
    rating: 5,
    comment:
      'The criteria-level feedback showed me exactly where my writing lost marks. Jumped a full band in one month.',
    publish: true,
  },
  {
    name: 'Fatima Al-Rashid',
    email: 'fatima.alrashid@example.com',
    country: 'AE',
    bands: { listening: 8, reading: 7.5, writing: 7, speaking: 7.5 },
    rating: 5,
    comment:
      'My examiner was so thorough. The detailed written feedback is something no other platform offers.',
    publish: true,
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    country: 'IN',
    bands: { listening: 7.5, reading: 7.5, writing: 7.5, speaking: 7.5 },
    rating: 4,
    comment: 'Realistic and well-organised. The speaking examiner was professional and thorough.',
    publish: true,
  },
];

async function seedLeaderboardStudents(
  packageId: string,
  teachers: { writing: string; speaking: string; both: string },
) {
  const studentHash = await bcrypt.hash('student', 12);
  let index = 0;

  for (const seed of LEADERBOARD_SEED) {
    index += 1;
    const overall =
      Math.round(
        ((seed.bands.listening +
          seed.bands.reading +
          seed.bands.writing +
          seed.bands.speaking) /
          4) *
          2,
      ) / 2;

    const user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        passwordHash: studentHash,
        role: UserRole.STUDENT,
        studentProfile: {
          create: {
            targetBand: 7.0,
            examType: ExamType.ACADEMIC,
            country: seed.country,
            publishToLeaderboard: seed.publish,
          },
        },
      },
      include: { studentProfile: true },
    });

    const mockDate = new Date('2026-05-20T09:00:00Z');
    mockDate.setDate(mockDate.getDate() - index);

    const enrollment = await prisma.enrollment.create({
      data: {
        enrollmentCode: `ENR-LB${1000 + index}`,
        studentId: user.studentProfile!.id,
        packageId,
        mockDate,
        mockTime: '09:00',
        status: EnrollmentStatus.COMPLETED,
        resultsStatus: 'RELEASED',
        writingTeacherId: teachers.writing,
        speakingTeacherId: teachers.speaking,
      },
    });

    await prisma.order.create({
      data: {
        orderCode: `ORD-LB${1000 + index}`,
        studentId: user.studentProfile!.id,
        enrollmentId: enrollment.id,
        packageId,
        amount: 49.0,
        paymentMethod: PaymentMethod.CARD,
        status: OrderStatus.PAID,
      },
    });

    const session = await prisma.examSession.create({
      data: {
        sessionCode: `MOCK-LB${1000 + index}`,
        enrollmentId: enrollment.id,
        state: ExamSessionState.RESULTS_RELEASED,
        checkInAt: mockDate,
      },
    });

    await prisma.sectionAttempt.createMany({
      data: (['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as ExamSkill[]).map(
        (skill) => ({
          sessionId: session.id,
          skill,
          startedAt: mockDate,
          submittedAt: mockDate,
          band: seed.bands[skill.toLowerCase() as keyof typeof seed.bands],
        }),
      ),
    });

    await prisma.review.create({
      data: {
        enrollmentId: enrollment.id,
        studentId: user.studentProfile!.id,
        packageId,
        teacherId: teachers.both,
        rating: seed.rating,
        comment: seed.comment,
        publishConsent: seed.publish,
      },
    });

    void overall;
  }
}

async function seedPayouts(teacherIds: string[]) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() - 1);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 13);

  const prevEnd = new Date(periodStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 13);

  const amounts = [325, 210, 890];
  const statuses: PayoutStatus[] = [
    PayoutStatus.PENDING,
    PayoutStatus.PROCESSING,
    PayoutStatus.PAID,
  ];

  for (let i = 0; i < teacherIds.length; i++) {
    const isPaid = statuses[i] === PayoutStatus.PAID;
    await prisma.payout.create({
      data: {
        teacherId: teacherIds[i],
        amount: amounts[i] ?? 200,
        currency: 'USD',
        status: statuses[i] ?? PayoutStatus.PENDING,
        periodStart: isPaid ? prevStart : periodStart,
        periodEnd: isPaid ? prevEnd : periodEnd,
        paidAt: isPaid ? prevEnd : null,
      },
    });
  }
}

async function seedBandTables() {
  const listeningBands = [
    { raw: 39, band: 9.0 },
    { raw: 37, band: 8.5 },
    { raw: 35, band: 8.0 },
    { raw: 32, band: 7.0 },
    { raw: 30, band: 6.5 },
    { raw: 26, band: 6.0 },
    { raw: 23, band: 5.5 },
    { raw: 18, band: 5.0 },
  ];

  const readingBands = [
    { raw: 39, band: 9.0 },
    { raw: 37, band: 8.5 },
    { raw: 35, band: 8.0 },
    { raw: 30, band: 7.0 },
    { raw: 27, band: 6.5 },
    { raw: 23, band: 6.0 },
    { raw: 19, band: 5.5 },
    { raw: 15, band: 5.0 },
  ];

  for (const row of listeningBands) {
    await prisma.bandConversionTable.create({
      data: { skill: ExamSkill.LISTENING, rawScore: row.raw, band: row.band },
    });
  }
  for (const row of readingBands) {
    await prisma.bandConversionTable.create({
      data: { skill: ExamSkill.READING, rawScore: row.raw, band: row.band },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
