import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseAuth = null;

const REQUIRED_ENV = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

/**
 * Initialise Firebase Admin from the service-account environment variables.
 * Throws a readable error at startup when configuration is missing.
 */
export function initFirebaseAdmin() {
  if (firebaseAuth) return firebaseAuth;

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    const err = new Error(
      `Firebase Admin is not configured. Missing environment variable${
        missing.length > 1 ? 's' : ''
      }: ${missing.join(', ')}.`
    );
    err.code = 'FIREBASE_NOT_CONFIGURED';
    throw err;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim() || '';

  // Clean up trailing comma or surrounding quotes if pasted directly from serviceAccount.json
  if (privateKey.endsWith(',')) {
    privateKey = privateKey.slice(0, -1).trim();
  }
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

export const getFirebaseAuth = () => firebaseAuth || initFirebaseAdmin();

/** Verify a Firebase ID token. Revoked tokens are rejected too. */
export const verifyFirebaseIdToken = (idToken) =>
  getFirebaseAuth().verifyIdToken(idToken, true);

export async function deleteFirebaseUser(uid) {
  if (!uid) return { deleted: false, skipped: true };

  try {
    await getFirebaseAuth().deleteUser(uid);
    return { deleted: true };
  } catch (err) {
    // The account may already have been removed from Firebase
    if (err.code === 'auth/user-not-found') {
      return { deleted: false, notFound: true };
    }
    throw err;
  }
}
