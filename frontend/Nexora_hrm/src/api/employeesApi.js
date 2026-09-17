import { request } from "./apiClient";

export async function fetchEmployees(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/employees/${query ? "?" + query : ""}`);
}

export async function createEmployee(data) {
  return request("/employees/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEmployee(id, data) {
  return request(`/employees/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteEmployee(id) {
  return request(`/employees/${id}/`, {
    method: "DELETE",
  });
}
