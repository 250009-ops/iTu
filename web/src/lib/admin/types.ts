export type LiveSkill = "speaking" | "writing" | "listening" | "reading";

export type LifecycleStatus = "in_progress" | "awaiting_results" | "complete";

export type ModuleKey = "listening" | "reading" | "writing" | "speaking";

export type TeacherStatus = "approved" | "pending" | "suspended";

export type TeacherSpeciality = "writing" | "speaking" | "both";

export type OrderStatus = "paid" | "refunded" | "failed" | "pending";

export type PaymentMethod =
  | "visa"
  | "mastercard"
  | "paypal"
  | "apple_pay"
  | "complimentary";

export type ExamTypeKind = "academic" | "general_training";

export type Student = {
  id: string;
  name: string;
  initials: string;
  email: string;
  targetBand: number | null;
  examType: ExamTypeKind;
  country: string | null;
  emailVerified: boolean;
  enrollments: number;
  joined: string;
};

export type TicketType =
  | "regrade_request"
  | "teacher_no_show"
  | "technical_issue"
  | "payment_dispute";

export type TicketPriority = "urgent" | "high" | "low";

export type TicketStatus = "open" | "in_progress" | "resolved";

export type SlaState = "active" | "overdue" | "resolved";

export type ReportTimeframe = "jun" | "q2" | "ytd";

export type TestStatus = "published" | "draft" | "review" | "archived";

export type ContentModule = "listening" | "reading" | "writing" | "speaking";

export type SettingsTab =
  | "general"
  | "exam_timers"
  | "commission"
  | "band_table"
  | "notifications"
  | "integrations";

export type PayoutSchedule = "weekly" | "biweekly" | "monthly";

export type Enrollment = {
  id: string;
  enrollmentId: string;
  studentName: string;
  initials: string;
  targetBand: number;
  country: string;
  examDate: string;
  examTime: string;
  completedModules: ModuleKey[];
  speakingExaminer: string;
  speakingExaminerInitials: string;
  writingExaminer: string;
  writingExaminerInitials: string;
  lifecycle: LifecycleStatus;
};

export type Examiner = {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: TeacherStatus;
  rating: number | null;
  sessions: number;
  totalEarned: number;
  joined: string;
  speciality: TeacherSpeciality;
};

export type TeacherApplication = {
  ieltsWritingBand?: number;
  ieltsSpeakingBand?: number;
  yearsExperience?: number;
  qualifications?: string[];
  certificateUrls?: string[];
  phone?: string | null;
  submittedAt?: string;
};

export type ExaminerDetail = Examiner & {
  bio?: string | null;
  languages?: string[];
  credentials?: string[];
  application?: TeacherApplication | null;
};

export type Order = {
  id: string;
  orderId: string;
  studentName: string;
  initials: string;
  enrollmentRef: string;
  package: string;
  paymentMethod: PaymentMethod;
  paymentLabel: string;
  date: string;
  amount: number;
  status: OrderStatus;
};

export type Ticket = {
  id: string;
  ticketId: string;
  date: string;
  studentName: string;
  initials: string;
  country: string;
  enrollmentRef: string;
  type: TicketType;
  preview: string;
  priority: TicketPriority;
  sla: {
    state: SlaState;
    label: string;
    progress?: number;
    tone?: "amber" | "emerald" | "rose";
  };
  assignee: string | null;
  status: TicketStatus;
};

export type LiveSessionRow = {
  id: string;
  sessionCode: string;
  studentName: string;
  country: string;
  initials: string;
  skill: string;
  skillType: LiveSkill;
  progress: number;
  timeLeft: string;
  examiner: string;
  integrity: "clear" | "flagged";
  flags: number;
};

export type ContentTest = {
  id: string;
  name: string;
  module: ContentModule;
  status: TestStatus;
  questions: number;
  mediaCount: number;
  lastUpdated: string;
  author: string;
  linkedPackages: number;
  activePackageLinks?: number;
  assignedMockLabel?: string | null;
  assignedMockLabels?: string[];
};

export type ExamTypeValue = "ACADEMIC" | "GENERAL_TRAINING";

export type ContentTestType = "LISTENING" | "READING" | "WRITING" | "SPEAKING";

export type AdminContentTestOption = {
  id: string;
  code: string;
  title: string;
  type: ContentTestType;
  status: string;
  assignedPackageId?: string | null;
  assignedPackageTitle?: string | null;
  assignedMockLabel?: string | null;
  assignedMockLabels?: string[];
  isPackaged?: boolean;
};

export type AdminPackage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  examType: ExamTypeValue;
  packageKind?: string;
  mockNumber?: number;
  mockLabel?: string;
  mostPopular: boolean;
  rating: number | null;
  reviewCount: number;
  skills: unknown[];
  included: string[];
  rules: string[];
  listeningTestId: string | null;
  readingTestId: string | null;
  writingTestId: string | null;
  speakingBankId: string | null;
  isActive: boolean;
  enrollmentCount: number;
  orderCount: number;
  updatedAt: string;
};
