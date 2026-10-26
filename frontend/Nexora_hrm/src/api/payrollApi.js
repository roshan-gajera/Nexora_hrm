import { request } from "./apiClient";

export async function fetchPayroll(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/payroll/${query ? "?" + query : ""}`);
}

export async function checkMonthPayroll(month) {
  return request(`/payroll/check_month/?month=${encodeURIComponent(month)}`);
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
