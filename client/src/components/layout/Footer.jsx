// ── Footer ────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { getCleanWhatsAppNumber } from '../../lib/utils';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const wa = getCleanWhatsAppNumber();

  return (
    <footer className="bg-mountain-900 text-cream-100 mt-auto border-t border-mountain-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-apricot-400 to-apricot-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-display font-bold text-lg">K</span>
              </div>
              <div>
                <span className="font-display font-bold text-lg text-cream-100">Karakoram Store</span>
              </div>
            </div>
            <p className="text-mountain-300 text-sm leading-relaxed max-w-xs">
              Bringing you authentic, handcrafted products from Hunza,
              Gilgit-Baltistan – where mountains touch the sky.
            </p>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-full text-sm font-medium transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>
            )}
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-display font-semibold text-cream-200 mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-mountain-300">
              <li><Link to="/shop" className="hover:text-apricot-400 transition-colors">All Products</Link></li>
              <li><Link to="/shop?category=dry-fruits" className="hover:text-apricot-400 transition-colors">Dry Fruits</Link></li>
              <li><Link to="/shop?category=caps-hats" className="hover:text-apricot-400 transition-colors">Caps & Hats</Link></li>
              <li><Link to="/shop?category=handicrafts" className="hover:text-apricot-400 transition-colors">Handicrafts</Link></li>
              <li><Link to="/shop?category=wallets-accessories" className="hover:text-apricot-400 transition-colors">Wallets & Accessories</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-display font-semibold text-cream-200 mb-4">Customer Care</h3>
            <ul className="space-y-2 text-sm text-mountain-300">
              <li><Link to="/track-order" className="hover:text-apricot-400 transition-colors">Track Order</Link></li>
              <li><Link to="/about" className="hover:text-apricot-400 transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-apricot-400 transition-colors">Contact Support</Link></li>
              <li><Link to="/cart" className="hover:text-apricot-400 transition-colors">Cart</Link></li>
              <li><Link to="/checkout" className="hover:text-apricot-400 transition-colors">Checkout</Link></li>
            </ul>

            <div className="mt-6">
              <p className="text-xs text-mountain-400">Payment</p>
              <p className="text-sm text-mountain-300 mt-1">Cash on Delivery (COD)</p>
              <p className="text-xs text-mountain-400 mt-3">Shipping</p>
              <p className="text-sm text-mountain-300 mt-1">Flat Rs. 200 across Pakistan</p>
            </div>
          </div>
        </div>

        <div className="border-t border-mountain-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-mountain-400">
            © {CURRENT_YEAR} Karakoram Store. All rights reserved.
          </p>
          <p className="text-xs text-mountain-500">
            Handcrafted with ❤️ from the Karakoram Mountains
          </p>
        </div>
      </div>
    </footer>
  );
}
