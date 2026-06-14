export type OrderStatus = "paid" | "refunded" | "failed" | "pending";

export type PaymentMethod = "visa" | "mastercard" | "paypal" | "apple_pay";

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

export const ordersSummary = {
  revenueCollected: 196,
  revenueTrend: "+18.4%",
  paidOrders: 4,
  paidTotal: 196,
  refundsIssued: 1,
  refundTotal: 49,
  failedPayments: 1,
};

export const monthlyOrderTrend = [
  { month: "Jan", revenue: 8200, orders: 12 },
  { month: "Feb", revenue: 9500, orders: 14 },
  { month: "Mar", revenue: 11000, orders: 18 },
  { month: "Apr", revenue: 10800, orders: 17 },
  { month: "May", revenue: 9200, orders: 14 },
  { month: "Jun", revenue: 7600, orders: 11 },
];

export const statusFilterOptions = [
  { value: "all", label: "All Status" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
] as const;

export const orders: Order[] = [
  {
    id: "1",
    orderId: "ORD-9821",
    studentName: "Alex Johnson",
    initials: "AJ",
    enrollmentRef: "ENR-3841",
    package: "Full Academic Mock",
    paymentMethod: "visa",
    paymentLabel: "Visa ····4521",
    date: "Jun 10, 2026",
    amount: 49,
    status: "paid",
  },
  {
    id: "2",
    orderId: "ORD-9820",
    studentName: "Maria Santos",
    initials: "MS",
    enrollmentRef: "ENR-3840",
    package: "Full Academic Mock",
    paymentMethod: "mastercard",
    paymentLabel: "MC ····8834",
    date: "Jun 9, 2026",
    amount: 49,
    status: "paid",
  },
  {
    id: "3",
    orderId: "ORD-9819",
    studentName: "Kai Chen",
    initials: "KC",
    enrollmentRef: "ENR-3839",
    package: "Full Academic Mock",
    paymentMethod: "paypal",
    paymentLabel: "PayPal",
    date: "Jun 8, 2026",
    amount: 49,
    status: "paid",
  },
  {
    id: "4",
    orderId: "ORD-9818",
    studentName: "Priya Sharma",
    initials: "PS",
    enrollmentRef: "ENR-3838",
    package: "Full Academic Mock",
    paymentMethod: "visa",
    paymentLabel: "Visa ····7712",
    date: "Jun 7, 2026",
    amount: 49,
    status: "paid",
  },
  {
    id: "5",
    orderId: "ORD-9815",
    studentName: "James Park",
    initials: "JP",
    enrollmentRef: "ENR-3835",
    package: "Full Academic Mock",
    paymentMethod: "apple_pay",
    paymentLabel: "Apple Pay",
    date: "Jun 5, 2026",
    amount: 49,
    status: "refunded",
  },
  {
    id: "6",
    orderId: "ORD-9812",
    studentName: "Emma Wilson",
    initials: "EW",
    enrollmentRef: "ENR-3832",
    package: "Speaking Only",
    paymentMethod: "visa",
    paymentLabel: "Visa ····3390",
    date: "Jun 4, 2026",
    amount: 29,
    status: "failed",
  },
];
