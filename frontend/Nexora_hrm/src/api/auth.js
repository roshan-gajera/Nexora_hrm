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
