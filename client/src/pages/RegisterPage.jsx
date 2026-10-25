// ── Register Page ──────────────────────────────────────────────
// Firebase creates the account and sends the verification email.
// The MongoDB user is only created after the email is verified.
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../lib/firebaseErrors';
import SEO from '../components/ui/SEO';
import GoogleAuthButton from '../components/ui/GoogleAuthButton';
import SiteLogoMark from '../components/ui/SiteLogoMark';
import { useSiteSettings } from '../hooks/useSiteSettings';

const RESEND_SECONDS = 60;
const PENDING_KEY = 'karakoram_pending_verification';

const fieldClass =
  'w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300';

const restorePending = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw);

    if (!saved?.email) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }

    return saved;
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
    return null;
  }
};

export default function RegisterPage() {
  const {
    register,
    resendVerificationEmail,
    completeRegistration,
    cancelPendingRegistration,
    user,
    googleRedirectError,
    clearGoogleRedirectError,
  } = useAuth();
  const navigate = useNavigate();
  const { logo } = useSiteSettings();
  const hasCustomLogo = Boolean(logo?.url);

  const [restored] = useState(restorePending);
  const [step, setStep] = useState(restored ? 'verify' : 'details'); // 'details' | 'verify'
  const [form, setForm] = useState({
    name: restored?.name || '',
    email: restored?.email || '',
    phone: restored?.phone || '',
    password: '',
  });
  const [pending, setPending] = useState(restored);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(''); // '' | 'resend' | 'verify' | 'back'
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
    clearGoogleRedirectError();
  };

  // Resend countdown
  useEffect(() => {
    if (step !== 'verify') return undefined;

    const timer = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const validDetails = () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    return true;
  };

  // Google returns through a full-page redirect. AuthContext completes the
  // sign-in and sets `user`; this effect takes over navigation.
  useEffect(() => {
    if (!user) return;
    sessionStorage.removeItem(PENDING_KEY);
    navigate(user.role === 'admin' ? '/admin' : '/my-orders', { replace: true });
  }, [user, navigate]);

  const displayError = error || googleRedirectError;

  // Step 1 — create the Firebase account and send the verification email
  const handleRegister = async (e) => {
    e.preventDefault();
    if (googleLoading) return;
    if (!validDetails()) return;

    setBusy('verify');
    setError('');
    setNotice('');
    clearGoogleRedirectError();

    try {
      const result = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });

      const saved = {
        name: result.name,
        email: result.email,
        phone: result.phone,
      };

      setPending(saved);
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(saved));
      setResendIn(RESEND_SECONDS);
      setStep('verify');

      if (result.verificationSent) {
        setNotice(`Verification email sent to ${result.email}.`);
      } else {
        setError(
          getAuthErrorMessage(
            { code: result.verificationError },
            'We could not send the verification email. Click "Resend email" to try again.'
          )
        );
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not create your account. Please try again.'));
    } finally {
      setBusy('');
    }
  };

  // Step 2 — only after Firebase confirms emailVerified, create the MongoDB user
  const handleVerified = async () => {
    if (busy) return;

    setBusy('verify');
    setError('');
    setNotice('');
    clearGoogleRedirectError();

    try {
      const user = await completeRegistration({
        name: pending?.name || form.name,
        phone: pending?.phone || form.phone,
      });

      sessionStorage.removeItem(PENDING_KEY);
      navigate(user?.role === 'admin' ? '/admin' : '/my-orders', { replace: true });
    } catch (err) {
      if (err?.code === 'auth/email-not-verified') {
        setError(
          'Your email is not verified yet. Open the link in your inbox, then click "I have verified" again.'
        );
      } else {
        setError(
          getAuthErrorMessage(err, 'Could not complete your registration. Please try again.')
        );
      }
    } finally {
      setBusy('');
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || busy) return;

    setBusy('resend');
    setError('');
    setNotice('');
    clearGoogleRedirectError();

    try {
      const result = await resendVerificationEmail();

      if (result?.alreadyVerified) {
        setNotice('Your email is already verified. Click "I have verified" to finish.');
      } else {
        setNotice(`A new verification email was sent to ${pending?.email || form.email}.`);
      }
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(
        getAuthErrorMessage(err, 'Could not resend the verification email. Please try again.')
      );
    } finally {
      setBusy('');
    }
  };

  const backToDetails = async () => {
    if (busy) return;

    setBusy('back');
    setError('');
    setNotice('');
    clearGoogleRedirectError();
    sessionStorage.removeItem(PENDING_KEY);

    try {
      await cancelPendingRegistration();
    } finally {
      setPending(null);
      setForm((f) => ({ ...f, email: '', password: '' }));
      setStep('details');
      setBusy('');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
      <SEO
        title={step === 'verify' ? 'Verify Your Email' : 'Create Account'}
        description="Join Karakoram Store. Create an account to easily track your orders and enjoy handcrafted gifts from Gilgit-Baltistan."
      />

      {/* Back to Store Navigation Button */}
      <div className="mb-4">
        <Link
          to="/"
          id="register-back-to-store-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Store</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-sm p-8 border border-cream-200">
        <div className="text-center mb-8">
          <SiteLogoMark
            size={hasCustomLogo ? '5xl' : '3xl'}
            maxWidthClass={hasCustomLogo ? 'max-w-[16rem]' : 'max-w-[9rem]'}
            className="mx-auto mb-3"
          />
          <h1 className="font-display font-bold text-2xl text-mountain-900 mb-1">
            {step === 'verify' ? 'Check Your Email' : 'Create an Account'}
          </h1>
          <p className="text-xs text-mountain-500">
            {step === 'verify'
              ? 'One last step to activate your account'
              : 'Join the Karakoram family for seamless order management'}
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

        {step === 'details' && (
          <>
            <GoogleAuthButton
              disabled={!!busy}
              onStart={() => {
                setError('');
                setNotice('');
                clearGoogleRedirectError();
              }}
              onError={setError}
              onLoadingChange={setGoogleLoading}
            />

            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-cream-200" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mountain-400">
                or sign up with email
              </span>
              <span className="h-px flex-1 bg-cream-200" />
            </div>
          </>
        )}

        {step === 'details' ? (
          <form onSubmit={handleRegister} noValidate className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                Full Name <span className="text-apricot-500">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Fatima Ali"
                required
                autoComplete="name"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                Email Address <span className="text-apricot-500">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                Phone Number <span className="text-mountain-400 text-[10px] lowercase">(optional)</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+92 3XX XXXXXXX"
                autoComplete="tel"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                Password <span className="text-apricot-500">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={busy === 'verify' || googleLoading}
              className="w-full py-3.5 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {busy === 'verify' ? 'Creating Account…' : 'Create Account'}
            </button>

            <p className="text-[11px] text-mountain-400 text-center leading-relaxed">
              We'll send a verification link to your email. Your account is only created after
              you verify it.
            </p>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-apricot-50 border border-apricot-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-apricot-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-mountain-700 leading-relaxed">
                We sent a verification link to
                <br />
                <strong className="text-mountain-900">{pending?.email || form.email}</strong>
              </p>
              <p className="text-xs text-mountain-500 mt-3 leading-relaxed">
                Open the link in that email, then come back and click{' '}
                <strong>I have verified</strong>. Don't forget to check your spam folder.
              </p>
            </div>

            <button
              id="register-verified-btn"
              type="button"
              onClick={handleVerified}
              disabled={!!busy}
              className="w-full py-3.5 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy === 'verify' ? 'Checking…' : 'I have verified'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={backToDetails}
                disabled={!!busy}
                className="text-mountain-500 hover:text-mountain-800 font-medium disabled:opacity-50"
              >
                ← Use a different email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0 || !!busy}
                className="text-apricot-600 font-semibold hover:text-apricot-700 disabled:text-mountain-400 disabled:cursor-not-allowed"
              >
                {busy === 'resend'
                  ? 'Sending…'
                  : resendIn > 0
                    ? `Resend email in ${resendIn}s`
                    : 'Resend email'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-cream-200 text-center">
          <p className="text-xs text-mountain-600">
            Already have an account?{' '}
            <Link to="/login" className="text-apricot-600 font-semibold hover:text-apricot-700 underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
