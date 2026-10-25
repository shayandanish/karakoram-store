import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminNotAuthorized from '../../pages/admin/AdminNotAuthorized';

export default function AdminGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-apricot-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-apricot-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-medium text-mountain-800 tracking-wide">
          Verifying administrative privileges...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (user.role !== 'admin') {
    return <AdminNotAuthorized />;
  }

  return <Outlet />;
}
