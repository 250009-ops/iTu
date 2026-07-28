import type {
  Enrollment,
  Examiner,
  Order,
  Student,
  Ticket,
} from "@/lib/admin/types";
import { downloadCsv } from "@/lib/export/csv";

const dateStamp = () => new Date().toISOString().slice(0, 10);

export function exportEnrollmentsCsv(enrollments: Enrollment[]) {
  downloadCsv(
    `enrollments-${dateStamp()}.csv`,
    [
      "Enrollment ID",
      "Student",
      "Country",
      "Target Band",
      "Exam Date",
      "Exam Time",
      "Lifecycle",
      "Speaking Examiner",
      "Writing Examiner",
      "Completed Modules",
    ],
    enrollments.map((e) => [
      e.enrollmentId,
      e.studentName,
      e.country,
      e.targetBand ?? "",
      e.examDate,
      e.examTime,
      e.lifecycle,
      e.speakingExaminer,
      e.writingExaminer,
      e.completedModules.join("; "),
    ]),
  );
}

export function exportOrdersCsv(orders: Order[]) {
  downloadCsv(
    `orders-${dateStamp()}.csv`,
    [
      "Order ID",
      "Student",
      "Enrollment",
      "Package",
      "Amount",
      "Payment",
      "Date",
      "Status",
    ],
    orders.map((o) => [
      o.orderId,
      o.studentName,
      o.enrollmentRef,
      o.package,
      o.amount,
      o.paymentLabel,
      o.date,
      o.status,
    ]),
  );
}

export function exportStudentsCsv(students: Student[]) {
  downloadCsv(
    `students-${dateStamp()}.csv`,
    [
      "Name",
      "Email",
      "Email Verified",
      "Exam Type",
      "Target Band",
      "Country",
      "Enrollments",
      "Joined",
    ],
    students.map((s) => [
      s.name,
      s.email,
      s.emailVerified ? "yes" : "no",
      s.examType,
      s.targetBand ?? "",
      s.country ?? "",
      s.enrollments,
      s.joined,
    ]),
  );
}

export function exportTeachersCsv(examiners: Examiner[]) {
  downloadCsv(
    `teachers-${dateStamp()}.csv`,
    [
      "Name",
      "Email",
      "Status",
      "Speciality",
      "Rating",
      "Sessions",
      "Total Earned",
      "Joined",
    ],
    examiners.map((t) => [
      t.name,
      t.email,
      t.status,
      t.speciality,
      t.rating ?? "",
      t.sessions,
      t.totalEarned,
      t.joined,
    ]),
  );
}

export function exportDisputesCsv(tickets: Ticket[]) {
  downloadCsv(
    `support-tickets-${dateStamp()}.csv`,
    [
      "Ticket ID",
      "Date",
      "Reporter",
      "Role",
      "Related",
      "Enrollment",
      "Type",
      "Priority",
      "Status",
      "Subject",
      "Description",
    ],
    tickets.map((t) => [
      t.ticketId,
      t.date,
      t.reporterName,
      t.reporterRole,
      t.relatedRef ?? "",
      t.enrollmentRef,
      t.type,
      t.priority,
      t.status,
      t.preview,
      t.description,
    ]),
  );
}

export function exportReportsCsv(data: {
  teacherLeaderboard: {
    name: string;
    sessions: number;
    rating: number;
    totalEarned: number;
  }[];
  enrollmentFunnel: { month: string; enrolled: number; completed: number }[];
  revenueExamVolume: { month: string; revenue: number; exams: number }[];
}) {
  const rows: (string | number)[][] = [
    ["--- Teacher leaderboard ---", "", "", ""],
    ["Name", "Sessions", "Rating", "Earned"],
    ...data.teacherLeaderboard.map((t) => [
      t.name,
      t.sessions,
      t.rating,
      t.totalEarned,
    ]),
    [],
    ["--- Enrollment funnel ---", "", ""],
    ["Stage", "Enrolled", "Completed"],
    ...data.enrollmentFunnel.map((f) => [f.month, f.enrolled, f.completed]),
    [],
    ["--- Revenue ---", "", ""],
    ["Month", "Revenue", "Exams"],
    ...data.revenueExamVolume.map((r) => [r.month, r.revenue, r.exams]),
  ];

  downloadCsv(`reports-${dateStamp()}.csv`, ["Section", "Col 2", "Col 3", "Col 4"], rows);
}
