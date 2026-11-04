const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'orders', 'catalog', 'accounts', 'content', 'users'],
  orders_manager: ['dashboard', 'orders'],
  catalog_manager: ['dashboard', 'catalog'],
  accounts_manager: ['dashboard', 'accounts'],
  content_manager: ['dashboard', 'content'],
};

export const hasAdminAccess = (role) => Boolean(ROLE_PERMISSIONS[role]);

export const hasAdminPermission = (role, permission) =>
  Boolean(ROLE_PERMISSIONS[role]?.includes(permission));

export const getAdminPermissionForPath = (pathname) => {
  if (pathname.startsWith('/admin/orders')) return 'orders';
  if (pathname.startsWith('/admin/accounts')) return 'accounts';
  if (pathname.startsWith('/admin/settings')) return 'content';
  if (pathname.startsWith('/admin/users')) return 'users';
  if (pathname.startsWith('/admin/staff')) return 'users';
  if (pathname.startsWith('/admin/activity')) return 'users';
  if (
    pathname.startsWith('/admin/products') ||
    pathname.startsWith('/admin/categories') ||
    pathname.startsWith('/admin/artisans') ||
    pathname.startsWith('/admin/cities') ||
    pathname.startsWith('/admin/coupons')
  ) return 'catalog';
  return 'dashboard';
};
