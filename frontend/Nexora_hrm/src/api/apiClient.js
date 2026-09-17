const BASE_URL = "http://127.0.0.1:8000/api";

export function getAccessToken() {
  return localStorage.getItem("nexora_access_token");
}

export function getRefreshToken() {
  return localStorage.getItem("nexora_refresh_token");
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem("nexora_access_token", access);
  if (refresh) localStorage.setItem("nexora_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("nexora_access_token");
  localStorage.removeItem("nexora_refresh_token");
  localStorage.removeItem("nexora_user");
}

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
  ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If 401 Unauthorized, attempt refresh if refresh token exists
    if (response.status === 401 && getRefreshToken() && !endpoint.includes("/auth/")) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${getAccessToken()}`;
        response = await fetch(url, { ...config, headers });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.access, data.refresh);
      return true;
    } else {
      clearTokens();
      return false;
    }
  } catch (err) {
    clearTokens();
    return false;
  }
}
