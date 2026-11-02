import { request } from "./apiClient";

export async function fetchJobs() {
  return request("/jobs/");
}

export async function createJob(data) {
  return request("/jobs/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchCandidates() {
  return request("/candidates/");
}

export async function createCandidate(data) {
  return request("/candidates/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function moveCandidateStage(candidateId, stage, salary = undefined) {
  const body = { stage };
  if (salary !== undefined && salary !== null && salary !== "") {
    body.salary = parseFloat(salary) || 0;
  }
  return request(`/candidates/${candidateId}/move_stage/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function toggleJobStatus(jobId) {
  return request(`/jobs/${jobId}/toggle_status/`, {
    method: "POST",
  });
}

export async function closeJob(jobId) {
  return request(`/jobs/${jobId}/close/`, {
    method: "POST",
  });
}
