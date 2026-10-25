import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const envNames = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => envNames[key]);

let auth = null;

if (missing.length > 0) {
  // Keep the rest of the store usable; auth actions show a clear error.
  console.error(`Firebase is not configured. Add these to client/.env: ${missing.join(', ')}`);
} else {
  // Reuse the app during Vite HMR instead of registering a second one
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export const firebaseAuth = auth;
