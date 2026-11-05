// ── Login Page ─────────────────────────────────────────────────
// Firebase handles the password check and email-verification state;
// the backend then issues the existing httpOnly JWT cookie.
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../lib/firebaseErrors';
import SEO from '../components/ui/SEO';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import SiteLogoMark from '../components/ui/SiteLogoMark';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { hasAdminAccess } from '../lib/adminAccess';

const RESEND_SECONDS = 60;

const getLoginDestination = (authenticatedUser, redirectParam) => {
  const defaultDestination =
    hasAdminAccess(authenticatedUser?.role) ? '/admin' : '/my-orders';
  const redirectPath =
    typeof redirectParam === 'string' ? redirectParam : redirectParam?.pathname;

  if (
    !redirectPath?.startsWith('/') ||
    redirectPath.startsWith('//') ||
    (!hasAdminAccess(authenticatedUser?.role) &&
      (redirectPath === '/admin' || redirectPath.startsWith('/admin/')))
  ) {
    return defaultDestination;
  }

  return redirectParam;
};

export default function LoginPage() {
  const {
    login,
    completeMfaSignIn,
    mfaRequired,
    adminLogin,
    staffLogin,
    resendVerificationEmail,
    sendPasswordReset,
    user,
    googleRedirectError,
    clearGoogleRedirectError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { logo, settings } = useSiteSettings();
  const hasCustomLogo = Boolean(logo?.url);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect') || location.state?.from;

  // Resend countdown
  useEffect(() => {
    if (!needsVerification) return undefined;

    const timer = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [needsVerification]);

  // Google returns through a full-page redirect. AuthContext completes the
  // sign-in and sets `user`; this effect takes over navigation.
  useEffect(() => {
    if (mfaRequired) setNeedsMfa(true);
  }, [mfaRequired]);

  useEffect(() => {
    if (!user) return;
    navigate(getLoginDestination(user, redirectParam), { replace: true });
  }, [user, navigate, redirectParam]);

  const displayError = error || googleRedirectError;
  const credential = email.trim();
  const emailOrUsernameError = submitted && !credential
    ? 'Enter your email address or username.'
    : submitted && credential.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential)
      ? 'Enter a valid email address.'
      : '';
  const passwordError = submitted && !password ? 'Enter your password.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setSubmitted(true);

    if (!email.trim() || !password) {
      setError('Check the highlighted fields and try again.');
      return;
    }
    if (email.trim().includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setNeedsVerification(false);
    clearGoogleRedirectError();

    try {
      // Staff accounts use admin-created usernames; customers and admins use email.
      // Detect the credential type from its shape so the login page never exposes roles.
      if (!email.trim().includes('@')) {
        try {
          const staffUser = await staffLogin(email.trim(), password);
          navigate(getLoginDestination(staffUser, redirectParam), { replace: true });
        } catch (staffError) {
          setError(staffError?.response?.data?.message || (!staffError?.response
            ? 'Could not reach the store server. Check your connection and try again.'
            : 'Could not sign in with these credentials. Check them and try again.'));
        }
        return;
      }

      const loggedUser = await login(email.trim(), password);
      if (loggedUser?.requiresMfa) {
        setNeedsMfa(true);
        return;
      }
      navigate(getLoginDestination(loggedUser, redirectParam), { replace: true });
    } catch (err) {
      // Seeded admins may not have a Firebase account yet. Fall back to the
      // backend's admin-only password login when Firebase rejects the login.
      if (
        ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(
          err?.code
        )
      ) {
        try {
          const adminUser = await adminLogin(email.trim(), password);
          navigate(getLoginDestination(adminUser, redirectParam), { replace: true });
          return;
        } catch (adminLoginError) {
          if (!adminLoginError.response) {
            setError('Could not reach the store server. Check that the API is running and CORS allows this site.');
            return;
          }
          if (adminLoginError.response.status !== 401) {
            setError(
              adminLoginError.response.data?.message ||
                'Could not complete administrator sign-in. Please try again.'
            );
            return;
          }
        }
      }

      if (err?.code === 'auth/email-not-verified') {
        setNeedsVerification(true);
        setVerificationEmail(email.trim());
        setResendIn(0);
        setError(
          'Your email address is not verified yet. Check your inbox, or resend the verification email below.'
        );
      } else {
        setError(getAuthErrorMessage(err, 'Could not sign in. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      setError('Enter the current 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const loggedUser = await completeMfaSignIn(mfaCode);
      setNeedsMfa(false);
      navigate(getLoginDestination(loggedUser, redirectParam), { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Authenticator verification failed. Try the current code again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || resending) return;

    setResending(true);
    setError('');
    setNotice('');
    clearGoogleRedirectError();

    try {
      const result = await resendVerificationEmail();

      if (result?.alreadyVerified) {
        setNotice('Your email is already verified. You can sign in now.');
      } else {
        setNotice(`A new verification email was sent to ${verificationEmail}.`);
        setResendIn(RESEND_SECONDS);
      }
    } catch (err) {
      setError(
        getAuthErrorMessage(err, 'Could not resend the verification email. Please try again.')
      );
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetLoading) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your email address above, then click "Forgot password?" again.');
      setNotice('');
      return;
    }

    setResetLoading(true);
    setError('');
    setNotice('');
    clearGoogleRedirectError();

    try {
      await sendPasswordReset(email.trim());
      setNotice(`Password reset email sent to ${email.trim()}. Check your inbox.`);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not send the password reset email.'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-b from-cream-50 via-white to-cream-100 px-4 py-10 sm:px-6 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-mountain-100/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-apricot-100/60 blur-3xl" />
      <div className="relative mx-auto max-w-md">
      <SEO
        title="Sign In"
        description={`Sign in to your ${settings.storeName} account to manage your orders and shipping details.`}
      />

      {/* Back to Store Navigation Button */}
      <div className="mb-4">
        <Link
          to="/"
          id="login-back-to-store-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Store</span>
        </Link>
      </div>

      <div className="rounded-3xl border border-cream-200 bg-white/95 p-6 shadow-xl shadow-mountain-900/5 backdrop-blur sm:p-8">
        <div className="text-center mb-8">
          <SiteLogoMark
            size={hasCustomLogo ? '5xl' : '3xl'}
            maxWidthClass={hasCustomLogo ? 'max-w-[16rem]' : 'max-w-[9rem]'}
            className="mx-auto mb-3"
            priority
            sizes="256px"
          />
          <h1 className="font-display font-bold text-2xl text-mountain-900 mb-1">
            Welcome Back
          </h1>
          <p className="text-xs text-mountain-500">
            Your mountain finds are just a sign in away
          </p>
        </div>

        {displayError && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{displayError}</span>
          </div>
        )}

        {needsVerification && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <p className="mb-2.5">
              We can send another verification link to{' '}
              <strong>{verificationEmail}</strong>.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendIn > 0 || resending}
              className="font-semibold underline underline-offset-2 hover:text-amber-900 disabled:text-amber-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resending
                ? 'Sending…'
                : resendIn > 0
                  ? `Resend verification email in ${resendIn}s`
                  : 'Resend verification email'}
            </button>
          </div>
        )}

        {notice && !displayError && (
          <div
            role="status"
            className="mb-6 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{notice}</span>
          </div>
        )}

        {needsMfa ? (
          <form onSubmit={handleMfaSubmit} className="space-y-4 rounded-xl border border-apricot-200 bg-apricot-50 p-4">
            <div>
              <h2 className="text-sm font-bold text-mountain-900">Administrator verification</h2>
              <p className="mt-1 text-xs text-stone-600">Enter the 6-digit code from your enrolled authenticator app.</p>
            </div>
          <input
              aria-label="Authenticator code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-apricot-400"
            />
            <button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full rounded-xl bg-mountain-900 py-3 text-sm font-bold text-white disabled:opacity-50">
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>
        ) : (
        <>
        <GoogleAuthButton
          disabled={loading}
          onStart={() => {
            setError('');
            setNotice('');
            setNeedsVerification(false);
            clearGoogleRedirectError();
          }}
          onError={setError}
          onMfaRequired={() => setNeedsMfa(true)}
          onLoadingChange={setGoogleLoading}
        />

        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-cream-200" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mountain-400">
            or sign in with email
          </span>
          <span className="h-px flex-1 bg-cream-200" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
              {email.includes('@') ? 'Email Address' : 'Email or Username'} <span className="text-apricot-500">*</span>
            </label>
            <input
              id="login-email"
              type="text"
              aria-invalid={Boolean(emailOrUsernameError)}
              aria-describedby={emailOrUsernameError ? 'login-email-error' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
                setNotice('');
                clearGoogleRedirectError();
              }}
              placeholder="you@example.com or username"
              required
              autoComplete="username"
              className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-mountain-600 focus-visible:ring-offset-2 bg-white text-mountain-800 placeholder-mountain-300 disabled:opacity-60"
              disabled={loading || googleLoading}
            />
            {emailOrUsernameError && <p id="login-email-error" className="mt-1.5 text-xs text-red-700" role="status">{emailOrUsernameError}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700">
                Password <span className="text-apricot-500">*</span>
              </label>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'login-password-error' : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                  setNotice('');
                  clearGoogleRedirectError();
                }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full border border-cream-300 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-mountain-600 focus-visible:ring-offset-2 bg-white text-mountain-800 placeholder-mountain-300 font-mono disabled:opacity-60"
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={loading || googleLoading}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <p id="login-password-error" className="mt-1.5 text-xs text-red-700" role="status">{passwordError}</p>}
            <div className="text-right mt-1.5">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading || loading || googleLoading}
                className="text-[11px] text-mountain-700 hover:text-apricot-700 font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mountain-600 rounded disabled:opacity-50"
              >
                {resetLoading ? 'Sending reset email…' : 'Forgot password?'}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        </>
        )}

        <div className="mt-6 pt-6 border-t border-cream-200 text-center space-y-3">
          <p className="text-xs text-mountain-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-apricot-600 font-semibold hover:text-apricot-700 underline">
              Create an account
            </Link>
          </p>
          <p className="text-[11px] text-mountain-400">
            Just want to buy? Guest checkout is always available on our Cart page.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
