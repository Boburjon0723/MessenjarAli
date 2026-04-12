import { getToken, getRefreshToken, getStorageForAuth, setAuth, clearAuth, getUser } from './auth-storage';
import { getPublicApiUrl } from './public-origin';

const API_URL = getPublicApiUrl();

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
    const token = typeof window !== 'undefined' ? getToken() : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    let response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // If unauthorized or forbidden, try to refresh token
    if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
            console.log('Access token expired, attempting refresh...');
            const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                const user = getUser();
                const storage = getStorageForAuth();
                const remember = storage === localStorage;
                setAuth(data.accessToken, data.refreshToken || refreshToken, (user || {}) as Record<string, unknown>, remember);

                return fetch(`${API_URL}${endpoint}`, {
                    ...options,
                    headers: {
                        ...headers,
                        'Authorization': `Bearer ${data.accessToken}`,
                    },
                });
            }
            const st = refreshResponse.status;
            /** 5xx / tarmoq: sessiyani saqlab qolamiz — vaqtincha server xatosi uchun logout emas */
            if (st === 401 || st === 403) {
                console.error('Refresh token invalid or expired, logging out...');
                clearAuth();
                window.location.href = '/login';
            } else {
                console.warn('Token refresh failed (temporary?), status:', st);
            }
        }
    }

    return response;
}
