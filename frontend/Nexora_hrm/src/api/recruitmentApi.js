import { request } from "./apiClient";

export async function fetchJobs() {
  return request("/jobs/");
}

export async function fetchCandidates() {
  return request("/candidates/");
}
