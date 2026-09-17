import { request } from "./apiClient";

export async function fetchDepartments() {
  return request("/departments/");
}

export async function createDepartment(data) {
  return request("/departments/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
