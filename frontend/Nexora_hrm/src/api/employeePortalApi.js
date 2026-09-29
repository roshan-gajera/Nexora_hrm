import { request } from "./apiClient";

/** Fetch the logged-in employee's own profile */
export async function fetchMyProfile() {
  return request("/auth/me/");
}

/** Update profile (partial) */
export async function updateMyProfile(data) {
  return request("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Fetch leave requests for the logged-in employee */
export async function fetchMyLeaves() {
  return request("/leaves/?mine=true");
}

/** Submit a new leave request */
export async function submitLeaveRequest(data) {
  return request("/leaves/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Fetch payroll/payslips for the logged-in employee */
export async function fetchMyPayslips() {
  return request("/payroll/?mine=true");
}

/** Fetch attendance for the logged-in employee */
export async function fetchMyAttendance() {
  return request("/attendance/?mine=true");
}

/** Change password */
export async function changePassword(oldPassword, newPassword) {
  return request("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}
