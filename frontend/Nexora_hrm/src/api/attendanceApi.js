import { request } from "./apiClient";

export async function fetchAttendance(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/attendance/${query ? "?" + query : ""}`);
}
