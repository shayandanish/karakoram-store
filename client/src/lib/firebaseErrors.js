const FIREBASE_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/weak-password': 'Your password is too weak. Use at least 8 characters.',
  'auth/missing-password': 'Please enter your password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/email-not-verified': 'Please verify your email address before signing in.',
  'auth/no-current-user':
    'Your verification session has expired. Please sign in to resend the verification email.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for this project.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled. Please try again.',
  'auth/popup-blocked':
    'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
  'auth/redirect-cancelled-by-user': 'Google sign-in was cancelled. Please try again.',
  'auth/redirect-operation-pending':
    'A Google sign-in is already in progress. Please wait a moment and try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method. Sign in with that method instead.',
  'auth/operation-not-supported-in-this-environment':
    'Google sign-in is not supported in this browser. Please try a different browser.',
  'auth/unauthorized-domain':
    'Google sign-in is not configured for this domain. Please contact support.',
  'auth/not-configured':
    'Firebase is not configured. Add the VITE_FIREBASE_* values to client/.env and restart the dev server.',
};

/** Turn Firebase and API errors into a friendly, user-facing message. */
export function getAuthErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    FIREBASE_ERROR_MESSAGES[error?.code] ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}
