// ── Mobile bottom navigation ─────────────────────────────────
import { NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

function Icon({ name, className = 'h-[22px] w-[22px]' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
    case 'shop':
      return (
        <svg {...common}>
          <path d="M4 7h16l-1.2 13.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 7Z" />
          <path d="M8.5 7V5.5a3.5 3.5 0 0 1 7 0V7" />
        </svg>
      );
    case 'wishlist':
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case 'orders':
      return (
        <svg {...common}>
          <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
          <path d="M8.5 8h7" />
          <path d="M8.5 12h7" />
          <path d="M8.5 16h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M3 4h2l2.2 10.4a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6" />
          <circle cx="9.5" cy="20" r="1.2" />
          <circle cx="17.5" cy="20" r="1.2" />
        </svg>
      );
  }
}

function BottomLink({ to, icon, label, badge, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-400 ${
          isActive ? 'text-apricot-600' : 'text-mountain-500 hover:text-mountain-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon name={icon} className={`h-[22px] w-[22px] ${isActive ? 'scale-110' : ''} transition-transform`} />
            {badge > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-apricot-500 px-1 text-[9px] font-bold leading-none text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          <span>{label}</span>
          {isActive && (
            <span className="absolute -top-px h-0.5 w-8 rounded-full bg-apricot-500" aria-hidden="true" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function MobileBottomNav() {
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_rgba(11,26,45,0.25)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 px-2 py-1.5">
        <BottomLink to="/" end icon="home" label="Home" />
        <BottomLink to="/shop" icon="shop" label="Shop" />
        <BottomLink to="/wishlist" icon="wishlist" label="Saved" badge={wishlistCount} />
        <BottomLink to="/my-orders" icon="orders" label="Orders" />
        <BottomLink to="/cart" icon="cart" label="Cart" badge={totalItems} />
      </div>
    </nav>
  );
}
