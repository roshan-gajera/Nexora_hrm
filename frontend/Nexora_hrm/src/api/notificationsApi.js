import { request } from "./apiClient";

const BASE = "/notifications";

/** Fetch latest notifications (global feed) */
export function fetchNotifications() {
  return request(`${BASE}/`);
}

/** Fetch unread count only (lightweight poll) */
export function fetchUnreadCount() {
  return request(`${BASE}/unread-count/`);
}

/** Fetch activity feed (latest 10 events) */
export function fetchActivityFeed() {
  return request(`${BASE}/activity-feed/`);
}

/** Mark a single notification as read */
export function markNotificationRead(id) {
  return request(`${BASE}/${id}/mark-read/`, { method: "POST" });
}

/** Mark all notifications as read */
export function markAllNotificationsRead() {
  return request(`${BASE}/mark-all-read/`, { method: "POST" });
}
