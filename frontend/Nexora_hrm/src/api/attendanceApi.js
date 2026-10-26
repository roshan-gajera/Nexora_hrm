import { request } from "./apiClient";

export async function fetchAttendance(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/attendance/${query ? "?" + query : ""}`);
}

export async function fetchAttendanceToday() {
  return request("/attendance/today/");
}

export async function fetchAttendanceSummary(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request(`/attendance/summary/${query}`);
}

export async function saveAttendance(data) {
  return request("/attendance/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
