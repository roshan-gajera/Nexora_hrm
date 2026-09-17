import { request } from "./apiClient";

export async function fetchPerformanceReviews() {
  return request("/reviews/");
}
