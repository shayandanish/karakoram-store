import axios from 'axios';
import { firebaseAuth } from '../firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

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

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
