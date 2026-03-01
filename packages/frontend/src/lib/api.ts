import axios from 'axios';

/**
 * Reads a cookie value by name.
 * The XSRF-TOKEN cookie is NOT httpOnly, so JavaScript can access it.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(^|;\\s*)' + name + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[2]) : null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies cross-origin (required for CSRF)
});

/**
 * Request interceptor: attach the CSRF token from the XSRF-TOKEN cookie
 * as the X-XSRF-TOKEN header on state-changing requests.
 */
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCookie('XSRF-TOKEN');
    if (token) {
      config.headers['X-XSRF-TOKEN'] = token;
    }
  }
  return config;
});

/**
 * Response interceptor: on a 403 CSRF error, fetch a fresh token
 * via GET and retry the original request once.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.code?.startsWith('CSRF_TOKEN') &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      // Fetch a fresh CSRF token cookie
      await api.get('/csrf/token');
      // Retry with the refreshed token
      const freshToken = getCookie('XSRF-TOKEN');
      if (freshToken) {
        originalRequest.headers['X-XSRF-TOKEN'] = freshToken;
      }
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

/**
 * Request interceptor: attach the JWT Bearer token from localStorage
 * as the Authorization header on every request when a token is present.
 * Runs after the CSRF interceptor is registered (LIFO order means this
 * interceptor executes first, which is harmless — they set independent headers).
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor: on a 401 Unauthorized response, clear the stored
 * JWT and perform a hard redirect to /login.
 * Runs after the CSRF 403-retry interceptor (FIFO order) and only handles
 * status 401, so it never interferes with the CSRF retry logic.
 *
 * Auth endpoints (/auth/login, /auth/register) intentionally return 401 for
 * invalid credentials — those responses must reach the page component so the
 * error message can be displayed. We skip the redirect/logout for those URLs.
 */
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      error !== null &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 401
    ) {
      // Let auth endpoints propagate the 401 to their callers unchanged
      const requestUrl = (error as { config?: { url?: string } })?.config?.url ?? '';
      if (requestUrl.includes('/auth/')) {
        return Promise.reject(error);
      }
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

