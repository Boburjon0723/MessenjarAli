import { API_URL } from "./config";
import { getToken, getRefreshToken, setAuth, clearAuth, getUser } from "./auth-storage";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized or forbidden, try to refresh token
  if (response.status === 401 || response.status === 403) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const user = await getUser();
          // We don't have easy access to rememberMe here, defaulting to true for now
          // or we could store it in SecureStore as well
          await setAuth({ token: data.accessToken, refreshToken: data.refreshToken || refreshToken }, user || {}, true);

          return fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${data.accessToken}`,
            },
          });
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }

      // If refresh failed or was 401/403, logout
      await clearAuth();
      // In a real app, you might want to use a navigation reset here
    }
  }

  return response;
}

