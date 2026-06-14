import { apiFetch } from "./client";

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function listNotifications(unreadOnly = false) {
  const query = unreadOnly ? "?unreadOnly=true" : "";
  return apiFetch<ApiNotification[]>(`/notifications${query}`);
}

export function markNotificationRead(id: string) {
  return apiFetch<{ marked: boolean }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return apiFetch<{ marked: boolean }>("/notifications/read-all", {
    method: "PATCH",
  });
}
