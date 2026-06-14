export type NotificationType = "results" | "schedule" | "graded" | "payment" | "system";

export type NotificationGroup = "Today" | "This week" | "Earlier";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  time: string;
  read: boolean;
  group?: NotificationGroup;
};

export const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    type: "results",
    title: "Speaking results",
    detail: "Band 7.0 released",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "schedule",
    title: "Mock scheduled",
    detail: "08:15 check-in",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "3",
    type: "graded",
    title: "Writing graded",
    detail: "Task 1: 6.5 · Task 2: 6.5",
    time: "3 hrs ago",
    read: true,
  },
];

/** Full history shown on the dedicated Notifications page. */
export const allNotifications: NotificationItem[] = [
  {
    id: "1",
    type: "results",
    title: "Speaking results released",
    detail: "Your Speaking band 7.0 for MOCK-004 is now available in Results.",
    time: "2 min ago",
    read: false,
    group: "Today",
  },
  {
    id: "2",
    type: "schedule",
    title: "Mock day scheduled",
    detail: "Your next mock is confirmed — check-in opens at 08:15.",
    time: "1 hr ago",
    read: false,
    group: "Today",
  },
  {
    id: "3",
    type: "graded",
    title: "Writing graded by Dr. Sarah Chen",
    detail: "Task 1: 6.5 · Task 2: 6.5. View detailed examiner feedback.",
    time: "3 hrs ago",
    read: true,
    group: "Today",
  },
  {
    id: "4",
    type: "results",
    title: "Full report ready",
    detail: "Overall Band 7.0 for MOCK-004 — download your PDF report.",
    time: "Yesterday",
    read: true,
    group: "This week",
  },
  {
    id: "5",
    type: "payment",
    title: "Payment receipt",
    detail: "Order ORD-1043 for the Full Academic Mock was successful.",
    time: "2 days ago",
    read: true,
    group: "This week",
  },
  {
    id: "6",
    type: "schedule",
    title: "Speaking examiner assigned",
    detail: "Dr. Emma Williams will conduct your Speaking session.",
    time: "3 days ago",
    read: true,
    group: "This week",
  },
  {
    id: "7",
    type: "system",
    title: "Welcome to IELTS Mock",
    detail: "Complete your profile to get personalised study recommendations.",
    time: "Mar 8, 2026",
    read: true,
    group: "Earlier",
  },
];
