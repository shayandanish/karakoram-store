// ── About Page ─────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';

export default function AboutPage() {
  return (
    <div className="py-12">
      <SEO
        title="About Us – The Karakoram Heritage"
        description="Learn the story behind Karakoram Store. Bringing authentic, preservative-free organic dried fruits, honey, and artisan crafts from Hunza Valley to your doorstep."
      />

      {/* Hero Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-apricot-100 text-apricot-800 text-xs font-semibold mb-4">
          <span>🏔️</span> Pure from Gilgit-Baltistan
        </span>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-mountain-900 leading-tight mb-6">
          Rooted in the Roof of the World
        </h1>
        <p className="text-mountain-700 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto font-light">
          We bridge the breathtaking valleys of Hunza and Gilgit-Baltistan with homes across Pakistan, delivering centuries of Himalayan wellness and craftsmanship.
        </p>
      </section>

      {/* Story Sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section 1: The Valley */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-cream-200 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-xs font-bold text-apricot-600 uppercase tracking-widest">Our Valley</span>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-mountain-900 mt-2 mb-4">
              Where Mountains Touch the Sky
            </h2>
            <p className="text-mountain-600 text-sm leading-relaxed mb-4">
              In the shadow of Rakaposhi, Ultar Sar, and Ladyfinger Peak, life in Hunza has long been defined by harmony with high-altitude nature. Fed by mineral-rich glacial streams, the apricot orchards and walnut groves produce fruits revered worldwide for unmatched flavor and longevity benefits.
            </p>
            <p className="text-mountain-600 text-sm leading-relaxed">
              Every apricot in our store is naturally sun-dried on rooftops using traditional family methods passed down through generations — without added sugars, sulfur, or preservatives.
            </p>
          </div>
          <div className="bg-gradient-to-br from-apricot-100 via-cream-200 to-mountain-100 rounded-2xl aspect-4/3 flex flex-col items-center justify-center p-8 text-center border border-apricot-200/50">
            <span className="text-6xl mb-4">☀️</span>
            <p className="font-display font-semibold text-mountain-800 text-lg">
              100% Sun-Dried & Organic
            </p>
            <p className="text-xs text-mountain-500 mt-2 max-w-xs">
              Natural glacial hydration and high-altitude mountain sun create intense natural sweetness.
            </p>
          </div>
        </section>

        {/* Section 2: Artisans & Heritage */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-cream-200 grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1 bg-gradient-to-br from-mountain-800 to-mountain-900 rounded-2xl aspect-4/3 flex flex-col items-center justify-center p-8 text-center text-white">
            <span className="text-6xl mb-4">🧶</span>
            <p className="font-display font-bold text-xl text-cream-100">
              Preserving Living Heritage
            </p>
            <p className="text-xs text-mountain-300 mt-2 max-w-xs">
              Handmade Pakols from pure wool, walnut wood carvings, and hand-stitched leather from Altit village.
            </p>
          </div>
          <div className="order-1 md:order-2">
            <span className="text-xs font-bold text-apricot-600 uppercase tracking-widest">Ethical Craft</span>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-mountain-900 mt-2 mb-4">
              Supporting Northern Artisans
            </h2>
            <p className="text-mountain-600 text-sm leading-relaxed mb-4">
              Behind our handicrafts are master artisans like Muhammad Kareem from Altit village. Many of these craft techniques are vulnerable to mass factory production; by purchasing directly from artisans, we ensure fair compensation and sustain cultural traditions.
            </p>
            <p className="text-mountain-600 text-sm leading-relaxed">
              When you wear a Karakoram Pakol or open a carved walnut wood box, you hold a tangible piece of northern folklore.
            </p>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: '🌿',
              title: 'Pure & Unadulterated',
              desc: 'No artificial additives, no syrup coats, and no compromises. Authentic harvest from Hunza orchards.',
            },
            {
              icon: '🤝',
              title: 'Fair Trade Direct',
              desc: 'We cut out middlemen so our northern farmers and local craftspeople receive what they deserve.',
            },
            {
              icon: '📦',
              title: 'Carefully Packed',
              desc: 'Safely packaged in eco-conscious food-grade containers and delivered with nationwide Cash on Delivery.',
            },
          ].map((pillar) => (
            <div key={pillar.title} className="bg-white rounded-2xl p-6 shadow-sm border border-cream-200 text-center">
              <span className="text-4xl block mb-3">{pillar.icon}</span>
              <h3 className="font-display font-semibold text-mountain-900 text-base mb-2">{pillar.title}</h3>
              <p className="text-xs text-mountain-600 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </section>

        {/* Call to action */}
        <section className="bg-gradient-to-r from-apricot-500 to-apricot-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-lg shadow-apricot-500/20">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-3">
            Experience the Flavors of the Karakoram
          </h2>
          <p className="text-cream-100 text-sm max-w-lg mx-auto mb-6">
            From golden dried apricots to freshly harvested walnuts and hand-embroidered caps, bring a taste of Hunza home.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/shop"
              className="px-8 py-3.5 bg-mountain-900 hover:bg-mountain-800 text-white font-semibold rounded-full text-sm transition-all shadow-md"
            >
              Explore Products
            </Link>
            <Link
              to="/contact"
              className="px-8 py-3.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-full text-sm backdrop-blur-xs transition-colors"
            >
              Get in Touch
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
