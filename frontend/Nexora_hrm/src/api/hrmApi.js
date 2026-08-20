import { request } from "./apiClient";

export async function fetchDashboardStats() {
  return request("/dashboard/stats/");
}

// Employees
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

// Departments
export async function fetchDepartments() {
  return request("/departments/");
}

export async function createDepartment(data) {
  return request("/departments/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Attendance
export async function fetchAttendance(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/attendance/${query ? "?" + query : ""}`);
}

// Leaves
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

// Payroll
export async function fetchPayroll(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/payroll/${query ? "?" + query : ""}`);
}

export async function updatePayroll(id, data) {
  return request(`/payroll/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function markPayrollPaid(id) {
  return request(`/payroll/${id}/mark_paid/`, {
    method: "POST",
  });
}

export async function generatePayroll(month) {
  return request("/payroll/bulk_process/", {
    method: "POST",
    body: JSON.stringify({ month }),
  });
}

// Jobs & Recruitment
export async function fetchJobs() {
  return request("/jobs/");
}

export async function fetchCandidates() {
  return request("/candidates/");
}

// Performance Reviews
export async function fetchPerformanceReviews() {
  return request("/reviews/");
}

// Announcements
export async function fetchAnnouncements() {
  return request("/announcements/");
}

// Assets
export async function fetchAssets() {
  return request("/assets/");
}
