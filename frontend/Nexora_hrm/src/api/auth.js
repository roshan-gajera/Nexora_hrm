import { request, setTokens, clearTokens } from "./apiClient";

export async function loginApi(email, password) {
  const data = await request("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.access && data?.refresh) {
    setTokens(data.access, data.refresh);
    if (data.user) {
      localStorage.setItem("nexora_user", JSON.stringify(data.user));
    }
  }
  return data;
}

export async function registerApi(first_name, last_name, email, password) {
  const data = await request("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ first_name, last_name, email, password, role: "employee" }), // default to employee role
  });
  if (data?.access && data?.refresh) {
    setTokens(data.access, data.refresh);
    if (data.user) {
      localStorage.setItem("nexora_user", JSON.stringify(data.user));
    }
  }
  return data;
}

export async function getMeApi() {
  return await request("/auth/me/");
}

export async function updateCredentialsApi({ first_name, last_name, email, password }) {
  const payload = {};
  if (first_name !== undefined) payload.first_name = first_name;
  if (last_name !== undefined) payload.last_name = last_name;
  if (email !== undefined) payload.email = email;
  if (password) payload.password = password;

  const data = await request("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (data?.access && data?.refresh) {
    setTokens(data.access, data.refresh);
  }

  const updatedUser = data?.user || data;
  if (updatedUser) {
    localStorage.setItem("nexora_user", JSON.stringify(updatedUser));
  }

  return {
    user: updatedUser,
    message: data?.detail || "Credentials updated directly in database.",
  };
}

export async function logoutApi() {
  try {
    const refresh = localStorage.getItem("nexora_refresh_token");
    if (refresh) {
      await request("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
    }
  } catch (err) {
    console.warn("Logout error:", err);
  } finally {
    clearTokens();
  }
}

export function getCurrentStoredUser() {
  const raw = localStorage.getItem("nexora_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Request a password reset OTP for the given email */
export async function forgotPasswordApi(email) {
  return request("/auth/forgot-password/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function changePasswordApi({ current_password, new_password }) {
  if (current_password) {
    return await request("/auth/change-password/", {
      method: "POST",
      body: JSON.stringify({
        old_password: current_password,
        new_password: new_password,
      }),
    });
  }
  return await updateCredentialsApi({ password: new_password });
}

/** Reset password with OTP */
export async function resetPasswordApi(email, otp, password) {
  return request("/auth/reset-password/", {
    method: "POST",
    body: JSON.stringify({ email, otp, password }),
  });
}
