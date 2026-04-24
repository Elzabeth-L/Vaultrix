import axios from 'axios';

const configuredGatewayUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || '';
export const apiBaseURL = !configuredGatewayUrl
  ? '/api'
  : configuredGatewayUrl.endsWith('/api')
    ? configuredGatewayUrl
    : `${configuredGatewayUrl}/api`;

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseURL}${normalizedPath}`;
};

const api = axios.create({ baseURL: apiBaseURL });

// Attach JWT on every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Log errors + redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url    = err.config?.url;
    console.error(`[API] ${status || 'NETWORK'} error on ${url}:`, err.message);
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
