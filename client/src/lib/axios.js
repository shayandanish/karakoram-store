import axios from 'axios';
import { firebaseAuth } from '../firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

const CSRF_STORAGE_KEY = 'kk_csrf_token';
const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function getStoredCsrf() {
  try {
    return sessionStorage.getItem(CSRF_STORAGE_KEY) || readCookie('csrf_token');
  } catch {
    return readCookie('csrf_token');
  }
}

function storeCsrf(token) {
  if (!token) return;
  try {
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

api.interceptors.request.use(async (config) => {
  let token = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    // localStorage might not be accessible
  }

  if (!token && firebaseAuth?.currentUser) {
    try {
      token = await firebaseAuth.currentUser.getIdToken();
    } catch {
      // ignore
    }
  }

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = (config.method || 'get').toLowerCase();
  if (MUTATING.has(method)) {
    const csrf = getStoredCsrf();
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const csrf = response.headers?.['x-csrf-token'];
    if (csrf) storeCsrf(csrf);
    return response;
  },
  (error) => {
    const csrf = error.response?.headers?.['x-csrf-token'];
    if (csrf) storeCsrf(csrf);
    return Promise.reject(error);
  }
);

export default api;
