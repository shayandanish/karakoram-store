import { Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <SEO
        title="404 – Page Not Found"
        description="The page you are looking for does not exist in Karakoram Store. Return home or browse our authentic collection."
      />

      <div className="w-20 h-20 mx-auto mb-6 bg-apricot-100 rounded-3xl flex items-center justify-center text-4xl shadow-inner">
        🏔️
      </div>
      <h1 className="font-display font-bold text-4xl text-mountain-900 mb-3">404</h1>
      <h2 className="font-display font-semibold text-xl text-mountain-800 mb-3">Path Lost in the Mountains</h2>
      <p className="text-mountain-600 text-sm mb-8 leading-relaxed">
        The page you are looking for doesn't exist or has wandered off the trail.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          id="notfound-home-btn"
          className="px-6 py-3 bg-apricot-500 hover:bg-apricot-600 text-white font-semibold rounded-full text-sm transition-all shadow-sm hover:shadow-md"
        >
          Return Home
        </Link>
        <Link
          to="/shop"
          id="notfound-shop-btn"
          className="px-6 py-3 bg-white border border-cream-300 hover:bg-cream-100 text-mountain-700 font-semibold rounded-full text-sm transition-colors"
        >
          Explore Shop
        </Link>
      </div>
    </div>
  );
}
