import { getToken, getRefreshToken, getStorageForAuth, setAuth, clearAuth, getUser, getCsrfToken } from './auth-storage';
import { getPublicApiUrl } from './public-origin';

const API_URL = getPublicApiUrl();

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

function withAuthHeaders(options: FetchOptions = {}): Record<string, string> {
    const token = typeof window !== 'undefined' ? getToken() : null;
    const method = (options.method || 'GET').toUpperCase();
    const csrf = method !== 'GET' && method !== 'HEAD' ? getCsrfToken() : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        ...options.headers,
    };
}

/** Server cookie + refresh invalidate, so‘ng local storage tozalash. */
export async function logoutSession(): Promise<void> {
    if (typeof window === 'undefined') {
        clearAuth();
        return;
    }
    const token = getToken();
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
        });
    } catch {
        /* network — local clear still runs */
    }
    clearAuth();
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
    const headers = withAuthHeaders(options);

    let response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    // If unauthorized or forbidden, try to refresh token
    if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
            const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                credentials: 'include',
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                const user = getUser();
                const storage = getStorageForAuth();
                const remember = storage === localStorage;
                setAuth(
                    data.accessToken,
                    data.refreshToken || refreshToken,
                    (user || {}) as Record<string, unknown>,
                    remember,
                    data.csrfToken
                );

                return fetch(`${API_URL}${endpoint}`, {
                    ...options,
                    headers: withAuthHeaders({
                        ...options,
                        headers: {
                            ...headers,
                            Authorization: `Bearer ${data.accessToken}`,
                        },
                    }),
                    credentials: 'include',
                });
            }
            const st = refreshResponse.status;
            /** 5xx / tarmoq: sessiyani saqlab qolamiz — vaqtincha server xatosi uchun logout emas */
            if (st === 401 || st === 403) {
                console.error('Refresh token invalid or expired, logging out...');
                await logoutSession();
                window.location.href = '/login';
            } else {
                console.warn('Token refresh failed (temporary?), status:', st);
            }
        }
    }

    return response;
}

/**
 * Access tokenni yangilash (REST 401 dan tashqari — masalan Socket.IO `Invalid token` uchun).
 * Muvaffaqiyatli bo‘lsa `true`.
 */
export async function tryRefreshAccessToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
        const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include',
        });
        if (!refreshResponse.ok) return false;
        const data = (await refreshResponse.json()) as {
            accessToken?: string;
            refreshToken?: string;
            csrfToken?: string;
        };
        if (!data.accessToken) return false;
        const user = getUser();
        const storage = getStorageForAuth();
        const remember = storage === localStorage;
        setAuth(
            data.accessToken,
            data.refreshToken || refreshToken,
            (user || {}) as Record<string, unknown>,
            remember,
            data.csrfToken
        );
        return true;
    } catch {
        return false;
    }
}
