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

export default api;
