export type NotificationType =
  | "results"
  | "schedule"
  | "graded"
  | "payment"
  | "system";

export type NotificationGroup = "Today" | "This week" | "Earlier";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  time: string;
  read: boolean;
  group?: NotificationGroup;
  href?: string;
};
