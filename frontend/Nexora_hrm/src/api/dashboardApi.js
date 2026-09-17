import { request } from "./apiClient";

export async function fetchDashboardStats() {
  return request("/dashboard/stats/");
}
