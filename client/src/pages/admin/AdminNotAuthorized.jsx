import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/ui/SEO';

export default function AdminNotAuthorized() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center px-4 py-12">
      <SEO title="Not Authorized - Admin Access Required" />
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-mountain-900 mb-2 font-display">Access Denied</h1>
        <p className="text-sm text-stone-600 mb-6 leading-relaxed">
          The <span className="font-semibold text-mountain-800">Karakoram Admin Dashboard</span> is restricted to administrators.
          {user?.email && (
            <span className="block mt-2 text-xs bg-stone-100 py-1.5 px-3 rounded-lg text-stone-700">
              Logged in as: <strong className="font-medium text-stone-900">{user.email}</strong> (Role: {user.role || 'customer'})
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-apricot-500 hover:bg-apricot-600 text-white font-medium text-sm shadow-xs transition focus:ring-2 focus:ring-apricot-400 focus:outline-hidden"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Store
          </Link>

          <button
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-sm transition focus:ring-2 focus:ring-stone-400 focus:outline-hidden"
          >
            Sign out of this account
          </button>
        </div>
      </div>
    </div>
  );
}
