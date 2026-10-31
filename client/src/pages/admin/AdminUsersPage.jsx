// ── Admin Users Page ──────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fmtDate } from '../../lib/utils';
import SEO from '../../components/ui/SEO';
import ResponsiveTable from '../../components/ResponsiveTable';

const PAGE_SIZE = 10;

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
        isAdmin
          ? 'bg-apricot-50 text-apricot-700 border border-apricot-200'
          : 'bg-stone-100 text-stone-600 border border-stone-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-apricot-500' : 'bg-stone-400'}`} />
      {isAdmin ? 'Admin' : 'Customer'}
    </span>
  );
}

function StatusBadge({ user }) {
  const verified = user.role === 'admin' || user.isVerified || user.status === 'verified';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
        verified
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
      title={verified ? 'Email verified' : 'Email not verified yet — the account cannot sign in'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {verified ? 'Verified' : 'Pending'}
    </span>
  );
}

function UserAvatar({ name }) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mountain-500 to-mountain-700 text-cream-50 flex items-center justify-center text-xs font-bold shrink-0">
      {initials || '?'}
    </div>
  );
}

function DeleteUserModal({ user, onClose, onConfirm, deleting }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h3 id="delete-user-title" className="font-display font-bold text-lg text-mountain-900 mb-1">
          Delete User?
        </h3>
        <p className="text-sm text-stone-500 mb-1">
          <strong className="text-mountain-800">{user.name}</strong>
        </p>
        <p className="text-xs text-stone-400 mb-6 break-all">{user.email}</p>
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mb-6">
          This permanently removes the account and cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 text-sm font-semibold hover:bg-stone-100 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {deleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              'Yes, Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounce the search box and return to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);
      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    },
    placeholderData: (previous) => previous,
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted successfully');
      setDeleteTarget(null);
      // If the last row on this page was deleted, step back a page
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/verify`),
    onSuccess: () => {
      toast.success('User verified — they can sign in now');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to verify user');
    },
  });

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <SEO title="Users — Admin" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
            Users
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage registered customers and administrators.
            {total > 0 && (
              <span className="text-stone-400"> {total} total</span>
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search users"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-apricot-400"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-b border-stone-100 last:border-0 animate-pulse bg-stone-50/50" />
           ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between gap-4">
          <span>Failed to load users: {error?.response?.data?.message || error?.message}</span>
          <button onClick={() => refetch()} className="text-xs underline font-semibold shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && users.length === 0 && (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8">
          <div className="text-5xl mb-3">👥</div>
          <h3 className="font-display font-bold text-mountain-900 text-lg">
            {search ? 'No matching users' : 'No users yet'}
          </h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto mt-1">
            {search
              ? `No accounts match "${search}". Try a different name or email.`
              : 'Registered customers will appear here.'}
          </p>
        </div>
      )}
 {/* Table */}
{!isLoading && !isError && users.length > 0 && (
  <ResponsiveTable
    columns={[
      {
        header: 'User',
        accessor: 'name',
        render: (row) => (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={row.name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-mountain-900 truncate">
                {row.name}
                {row._id === currentUser?._id && (
                  <span className="ml-2 text-[10px] font-semibold text-apricot-600 bg-apricot-50 border border-apricot-200 px-1.5 py-0.5 rounded-sm">
                    You
                  </span>
                )}
              </p>
              <p className="text-[11px] text-stone-400 font-mono truncate">#{row._id?.slice(-8)}</p>
            </div>
          </div>
        ),
      },
      {
        header: 'Email',
        accessor: 'email',
        render: (row) => (
          <div className="min-w-0">
            <p className="text-sm text-mountain-700 break-all">{row.email}</p>
            {row.phone && <p className="text-[11px] text-stone-400">{row.phone}</p>}
          </div>
        ),
      },
      {
        header: 'Role',
        accessor: 'role',
        render: (row) => <RoleBadge role={row.role} />, 
      },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => <StatusBadge user={row} />,
      },
      {
        header: 'Joined',
        accessor: 'createdAt',
        render: (row) => (
          <span className="text-sm text-stone-600 whitespace-nowrap">{fmtDate(row.createdAt)}</span>
        ),
      },
    ]}
    rows={users}
    rowKey="_id"
    actions={(row) => (
      <>
        {row.role !== 'admin' && !row.isVerified && row.status !== 'verified' && (
          <button
            type="button"
            onClick={() => verifyMutation.mutate(row._id)}
            disabled={verifyMutation.isPending && verifyMutation.variables === row._id}
            title={`Mark ${row.name}'s email as verified so they can sign in`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {verifyMutation.isPending && verifyMutation.variables === row._id ? (
              <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {verifyMutation.isPending && verifyMutation.variables === row._id ? 'Verifying…' : 'Verify'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDeleteTarget(row)}
          disabled={row._id === currentUser?._id}
          title={row._id === currentUser?._id ? 'You cannot delete your own account' : `Delete ${row.name}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Delete
        </button>
      </>
    )}
  />
)}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onClose={() => {
            if (!deleteMutation.isPending) setDeleteTarget(null);
          }}
          onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
