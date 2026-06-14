export const earningsPage = {
  billingCycle: "June 1 – June 30, 2026",
  netThisCycle: 280.0,
};

export const earningsSummary = {
  availableBalance: 2450.0,
  thisMonth: 760.0,
  thisMonthTrend: "+12.4%",
  thisMonthLabel: "June 2026 cycle",
  allTimeEarned: 14890,
  allTimeTrend: "+28.1%",
  allTimeSub: "312 completed sessions",
  avgPerSession: 29.5,
  avgTrend: "+5.3%",
  avgSub: "Speaking $25 · Writing $35",
  monthlyTrend: "+18% YoY",
};

export const monthlyEarnings = [
  { month: "Jan", amount: 980 },
  { month: "Feb", amount: 1120 },
  { month: "Mar", amount: 1050 },
  { month: "Apr", amount: 1180 },
  { month: "May", amount: 1320 },
  { month: "Jun", amount: 760 },
];

export const weeklyRevenue = [
  { day: "Mon", speaking: 50, writing: 35 },
  { day: "Tue", speaking: 75, writing: 70 },
  { day: "Wed", speaking: 25, writing: 35 },
  { day: "Thu", speaking: 100, writing: 105 },
  { day: "Fri", speaking: 50, writing: 35 },
  { day: "Sat", speaking: 25, writing: 0 },
  { day: "Sun", speaking: 0, writing: 0 },
];

export const nextPayout = {
  date: "June 30, 2026",
  bank: "Barclays ••••4521",
  method: "Bank transfer (2–3 business days)",
  projectedAmount: 760.0,
  daysRemaining: 21,
};

export type TransactionType = "speaking" | "writing" | "payout";
export type TransactionStatus = "completed" | "withdrawn";

export const transactions = [
  {
    id: "1",
    date: "Jun 12, 2026",
    time: "14:22",
    type: "speaking" as TransactionType,
    label: "Speaking Session",
    detail: "Alex Johnson",
    reference: "TXN-8821",
    status: "completed" as TransactionStatus,
    amount: 25.0,
  },
  {
    id: "2",
    date: "Jun 11, 2026",
    time: "11:05",
    type: "writing" as TransactionType,
    label: "Writing Grade",
    detail: "Emma Williams",
    reference: "TXN-8820",
    status: "completed" as TransactionStatus,
    amount: 35.0,
  },
  {
    id: "3",
    date: "Jun 11, 2026",
    time: "09:40",
    type: "speaking" as TransactionType,
    label: "Speaking Session",
    detail: "Kai Chen",
    reference: "TXN-8819",
    status: "completed" as TransactionStatus,
    amount: 25.0,
  },
  {
    id: "4",
    date: "Jun 10, 2026",
    time: "16:18",
    type: "writing" as TransactionType,
    label: "Writing Grade",
    detail: "Layla Hassan",
    reference: "TXN-8818",
    status: "completed" as TransactionStatus,
    amount: 35.0,
  },
  {
    id: "5",
    date: "Jun 9, 2026",
    time: "08:00",
    type: "payout" as TransactionType,
    label: "Bank Payout",
    detail: "Barclays ••••4521",
    reference: "PAY-2241",
    status: "withdrawn" as TransactionStatus,
    amount: -500.0,
  },
];
