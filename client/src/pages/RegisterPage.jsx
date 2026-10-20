// ── Register Page ──────────────────────────────────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/ui/SEO';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      navigate('/my-orders', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please check your information and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
      <SEO
        title="Create Account"
        description="Join Karakoram Store. Create an account to easily track your orders and enjoy handcrafted gifts from Gilgit-Baltistan."
      />

      <div className="bg-white rounded-3xl shadow-sm p-8 border border-cream-200">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-apricot-400 to-apricot-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <span className="text-white font-display font-bold text-2xl">K</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-mountain-900 mb-1">
            Create an Account
          </h1>
          <p className="text-xs text-mountain-500">
            Join the Karakoram family for seamless order management
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
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
              className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
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
              className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
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
              className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-apricot-500 hover:bg-apricot-600 disabled:bg-apricot-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

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
