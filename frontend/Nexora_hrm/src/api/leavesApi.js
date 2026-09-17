import { request } from "./apiClient";

export async function fetchLeaves(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/leaves/${query ? "?" + query : ""}`);
}

export async function createLeaveRequest(data) {
  return request("/leaves/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLeaveStatus(id, status) {
  return request(`/leaves/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
