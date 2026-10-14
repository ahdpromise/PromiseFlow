import { apiRequest } from "@/lib/api";

export type NotificationMetadata = {
  taskTitle?: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  target_path: string | null;
  metadata: NotificationMetadata | null;
  read_at: string | null;
  created_at: string;
  deleted_at: string | null;
};

export function getNotifications(
  token: string,
) {
  return apiRequest<Notification[]>(
    "/notifications",
    {
      token,
    },
  );
}

export function markNotificationAsRead(
  token: string,
  notificationId: string,
) {
  return apiRequest<Notification>(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      token,
    },
  );
}

export function deleteNotification(
  token: string,
  notificationId: string,
) {
  return apiRequest<{
    success: boolean;
  }>(
    `/notifications/${notificationId}`,
    {
      method: "DELETE",
      token,
    },
  );
}