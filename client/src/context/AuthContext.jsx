// ── Auth Context (Firebase identity + cookie-based JWT) ────────
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from 'firebase/auth';
import api from '../lib/axios';
import { firebaseAuth } from '../firebase';
import { getAuthErrorMessage } from '../lib/firebaseErrors';

const AuthContext = createContext(null);

const PENDING_VERIFICATION_KEY = 'karakoram_pending_verification';

const clearPendingVerification = () => {
  try {
    sessionStorage.removeItem(PENDING_VERIFICATION_KEY);
  } catch {
    // sessionStorage is unavailable (e.g. private mode restrictions)
  }
};

const requireFirebaseAuth = () => {
  if (!firebaseAuth) {
    const err = new Error(
      'Firebase is not configured. Add the VITE_FIREBASE_* values to client/.env and restart the dev server.'
    );
    err.code = 'auth/not-configured';
    throw err;
  }
  return firebaseAuth;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleRedirectError, setGoogleRedirectError] = useState('');
  const bootstrapRef = useRef(null);

  const clearGoogleRedirectError = useCallback(() => {
    setGoogleRedirectError('');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  /**
   * Finish a Firebase sign-in by exchanging the ID token for the normal
   * backend httpOnly cookie. Used after a Google redirect returns.
   */
  const completeFirebaseSignIn = useCallback(async (firebaseUser) => {
    await firebaseUser.reload();

    if (!firebaseUser.emailVerified) {
      const err = new Error('Google did not return a verified email address.');
      err.code = 'auth/email-not-verified';
      throw err;
    }

    const idToken = await firebaseUser.getIdToken(true);
    const res = await api.post('/auth/firebase-login', { idToken });

    setUser(res.data);
    clearPendingVerification();
    return res.data;
  }, []);

  // Bootstrap auth once. This must run before the /auth/me request so a
  // just-completed Google redirect can set the cookie without being
  // overwritten by a stale 401 from the previous page load.
  useEffect(() => {
    let isMounted = true;

    if (!bootstrapRef.current) {
      bootstrapRef.current = (async () => {
        let redirectUser = null;
        let redirectError = '';

        if (firebaseAuth) {
          try {
            const result = await getRedirectResult(firebaseAuth);
            if (result?.user) {
              redirectUser = await completeFirebaseSignIn(result.user);
            }
          } catch (err) {
            redirectError = getAuthErrorMessage(
              err,
              'Google sign-in could not be completed. Please try again.'
            );
          }
        }

        if (redirectUser) {
          return { user: redirectUser, error: redirectError };
        }

        try {
          const res = await api.get('/auth/me');
          return { user: res.data, error: redirectError };
        } catch {
          return { user: null, error: redirectError };
        }
      })();
    }

    bootstrapRef.current
      .then(({ user: nextUser, error }) => {
        if (!isMounted) return;
        if (error) setGoogleRedirectError(error);
        setUser(nextUser);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [completeFirebaseSignIn]);

  /**
   * Step 1 of registration: create the Firebase user and send the
   * verification email. No MongoDB account exists yet.
   */
  const register = async ({ name, email, phone, password }) => {
    const trimmedEmail = email.trim().toLowerCase();

    const auth = requireFirebaseAuth();
    const trimmedName = name.trim();
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

    try {
      await updateProfile(credential.user, { displayName: trimmedName });
    } catch {
      // Non-fatal — the name is also sent to the backend on completion
    }

    let verificationSent = true;
    let verificationError = '';

    try {
      await sendEmailVerification(credential.user);
    } catch (err) {
      verificationSent = false;
      verificationError = err?.code || 'auth/unknown';
    }

    return {
      name: trimmedName,
      email: credential.user.email || email.trim(),
      phone: phone?.trim() || '',
      verificationSent,
      verificationError,
    };
  };

  /** Resend the Firebase verification email to the signed-in pending user. */
  const resendVerificationEmail = async () => {
    const auth = requireFirebaseAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      const err = new Error('Your verification session has expired. Please sign in again.');
      err.code = 'auth/no-current-user';
      throw err;
    }

    if (firebaseUser.emailVerified) return { alreadyVerified: true };

    await sendEmailVerification(firebaseUser);
    return { alreadyVerified: false };
  };

  /**
   * Step 2 of registration: only after Firebase reports emailVerified,
   * get a fresh ID token and let the backend create the MongoDB user.
   */
  const completeRegistration = async ({ name, phone }) => {
    const auth = requireFirebaseAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      const err = new Error('Your verification session has expired. Please sign in again.');
      err.code = 'auth/no-current-user';
      throw err;
    }

    await firebaseUser.reload();

    if (!firebaseUser.emailVerified) {
      const err = new Error(
        'Your email is not verified yet. Open the link in your inbox, then try again.'
      );
      err.code = 'auth/email-not-verified';
      throw err;
    }

    const idToken = await firebaseUser.getIdToken(true);
    const res = await api.post('/auth/firebase-register', {
      idToken,
      name: (name || firebaseUser.displayName || '').trim(),
      phone: phone?.trim() || undefined,
    });

    setUser(res.data);
    clearPendingVerification();
    return res.data;
  };

  /** Firebase login. Unverified Firebase users are blocked here. */
  const login = async (email, password) => {
    const auth = requireFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await credential.user.reload();

    if (!credential.user.emailVerified) {
      const err = new Error('Please verify your email address before signing in.');
      err.code = 'auth/email-not-verified';
      throw err;
    }

    const idToken = await credential.user.getIdToken(true);
    const res = await api.post('/auth/firebase-login', { idToken });

    setUser(res.data);
    clearPendingVerification();
    return res.data;
  };

  /**
   * Google sign-in / sign-up. Redirects the whole page instead of opening
   * a popup, so browsers with popup blockers cannot leave the button stuck
   * on "Connecting to Google...". The redirect result is completed by the
   * bootstrap effect above when the user returns.
   */
  const loginWithGoogle = async () => {
    const auth = requireFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    await signInWithRedirect(auth, provider);
  };

  /** Send a Firebase password-reset email. */
  const sendPasswordReset = async (email) => {
    if (!email?.trim()) {
      const err = new Error('Please enter your email address first.');
      err.code = 'auth/missing-email';
      throw err;
    }

    await sendPasswordResetEmail(requireFirebaseAuth(), email.trim());
  };

  /**
   * Legacy password login for seeded admins whose email may not have a
   * Firebase account yet. The backend rejects non-admin accounts.
   */
  const adminLogin = async (email, password) => {
    const res = await api.post('/auth/login', { email: email.trim(), password });
    setUser(res.data);
    clearPendingVerification();
    return res.data;
  };

  /** Abandon an unverified Firebase sign-up ("use a different email"). */
  const cancelPendingRegistration = async () => {
    if (!firebaseAuth) return;

    try {
      await signOut(firebaseAuth);
    } catch {
      // Nothing to sign out of
    }
  };

  /** Sign out of both Firebase and the backend cookie. */
  const logout = async () => {
    if (firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch {
        // Firebase may not have an active session
      }
    }

    try {
      await api.post('/auth/logout');
    } catch {
      // The cookie may already be gone
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        googleRedirectError,
        clearGoogleRedirectError,
        login,
        loginWithGoogle,
        adminLogin,
        register,
        resendVerificationEmail,
        completeRegistration,
        cancelPendingRegistration,
        sendPasswordReset,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
