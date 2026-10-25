// ── Google Sign-In Button ─────────────────────────────────────
// Uses Firebase's Google provider via a full-page redirect. The backend
// verifies the Firebase ID token and issues the normal httpOnly JWT cookie.
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAuthErrorMessage } from '../../lib/firebaseErrors';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.741 2.982-4.305 2.982-7.351z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.598-4.124H3.06v2.59A9.996 9.996 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.402 13.899A6.01 6.01 0 0 1 6.09 12c0-.659.113-1.299.312-1.899V7.51H3.06A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.06 4.49l3.342-2.591z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.99 14.695 2 12 2a9.996 9.996 0 0 0-8.94 5.51l3.342 2.591C7.19 7.737 9.395 5.977 12 5.977z"
      />
    </svg>
  );
}

export default function GoogleAuthButton({
  onStart,
  onError,
  onLoadingChange,
  disabled = false,
  label = 'Continue with Google',
}) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  const setBusy = (value) => {
    setLoading(value);
    onLoadingChange?.(value);
  };

  const handleClick = async () => {
    if (loading || disabled || startedRef.current) return;

    onStart?.();
    startedRef.current = true;
    setBusy(true);

    try {
      // Redirect flow: the browser leaves this page. When Google sends the
      // user back, AuthContext completes the sign-in and the page navigates.
      await loginWithGoogle();

      // Safety net — normally the page unloads immediately. If something
      // (e.g. an extension) blocks the redirect, unwind the loading state.
      setTimeout(() => {
        if (startedRef.current) {
          startedRef.current = false;
          onError?.('Google sign-in did not open. Please check your connection and try again.');
          setBusy(false);
        }
      }, 10000);
    } catch (err) {
      startedRef.current = false;
      onError?.(
        getAuthErrorMessage(err, 'Could not continue with Google. Please try again.')
      );
      setBusy(false);
    }
  };

  return (
    <button
      id="google-auth-btn"
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3 text-sm font-semibold text-mountain-800 shadow-sm transition-colors hover:border-apricot-300 hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cream-300 border-t-apricot-500"
          aria-hidden="true"
        />
      ) : (
        <GoogleIcon />
      )}
      <span>{loading ? 'Connecting to Google…' : label}</span>
    </button>
  );
}
