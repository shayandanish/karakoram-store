// ── Trust badges strip ───────────────────────────────────────
const ITEMS = [
  {
    icon: 'shield',
    title: 'Secure checkout',
    text: 'Your details stay private',
  },
  {
    icon: 'truck',
    title: 'Nationwide delivery',
    text: 'Typically 2–5 working days',
  },
  {
    icon: 'hand',
    title: 'Handcrafted in Hunza',
    text: 'Sourced directly from artisans',
  },
  {
    icon: 'cash',
    title: 'Cash on delivery',
    text: 'Pay when your parcel arrives',
  },
];

function BadgeIcon({ name }) {
  const common = {
    className: 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'truck':
      return (
        <svg {...common}>
          <path d="M3 6.5h10.5v9H3z" />
          <path d="M13.5 10H17l3 3v2.5h-6.5z" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17.5" cy="18" r="1.6" />
        </svg>
      );
    case 'hand':
      return (
        <svg {...common}>
          <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
          <path d="M12 10.5V4.5a1.5 1.5 0 0 1 3 0V11" />
          <path d="M15 10.5V6a1.5 1.5 0 0 1 3 0v6.5a7 7 0 0 1-7 7H9.5a5.5 5.5 0 0 1-5.5-5.5v-2a1.5 1.5 0 0 1 3 0" />
          <path d="M6 12V9.5a1.5 1.5 0 0 1 3 0V12" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M6 9.5v5M18 9.5v5" />
        </svg>
      );
  }
}

/**
 * variant: "grid" (default) for page sections, "inline" for compact sidebars.
 */
export default function TrustBadges({ variant = 'grid', className = '' }) {
  if (variant === 'inline') {
    return (
      <ul
        className={`grid grid-cols-2 gap-2 text-[11px] text-mountain-600 ${className}`}
        aria-label="Store guarantees"
      >
        {ITEMS.map((item) => (
          <li key={item.title} className="flex items-center gap-1.5">
            <span className="text-apricot-600">
              <BadgeIcon name={item.icon} />
            </span>
            <span className="font-medium">{item.title}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}
      aria-label="Store guarantees"
    >
      {ITEMS.map((item) => (
        <li
          key={item.title}
          className="flex items-start gap-2.5 rounded-xl border border-cream-200 bg-white/70 p-3"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-apricot-50 text-apricot-600">
            <BadgeIcon name={item.icon} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-mountain-800">{item.title}</span>
            <span className="block text-[11px] leading-snug text-mountain-500">{item.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
