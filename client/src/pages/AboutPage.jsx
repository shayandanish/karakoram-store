// ── About / Our Story Page ────────────────────────────────────
import { Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';
import { useSiteSettings } from '../hooks/useSiteSettings';

const FOUNDERS = [
  { name: 'Shayan Danish', role: 'Founder' },
  { name: 'Inam Karim', role: 'Co-founder' },
  { name: 'Saif Ullah Baig', role: 'Co-founder' },
];

export default function AboutPage() {
  const { settings } = useSiteSettings();
  const pageCopy = settings.pageContent.about;

  return (
    <main className="bg-cream-100 py-12 sm:py-16">
      <SEO
        title={pageCopy.seoTitle}
        description={pageCopy.seoDescription || `Learn about ${settings.storeName} and the team behind our Gilgit-Baltistan store.`}
        canonicalUrl="/about"
      />

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <header className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-apricot-600">
            Rooted in Gilgit-Baltistan
          </p>
          <h1 className="font-display text-3xl font-medium leading-tight text-mountain-900 sm:text-5xl">
            Our Story
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-mountain-600 sm:text-lg">
            {pageCopy.intro}
          </p>
        </header>

        <article className="mx-auto max-w-3xl space-y-6 text-[15px] leading-8 text-mountain-700 sm:text-base">
          <p>
            {pageCopy.story}
          </p>
          <p>
            Our collection brings together regional food, artisan goods, and cultural products. We want each part of the experience—from exploring the collection to getting help with an order—to feel straightforward and welcoming.
          </p>
          <p>
            The founding team behind {settings.storeName}.
          </p>
        </article>

        {pageCopy.sections?.length > 0 && (
          <div className="mx-auto mt-12 max-w-5xl space-y-10 sm:mt-16">
            {pageCopy.sections.map((section, index) => (
              <section key={`${section.heading}-${index}`} className="grid items-center gap-6 border-y border-cream-300 py-8 sm:grid-cols-2 sm:gap-10 sm:py-10">
                <div className={index % 2 ? 'sm:order-2' : ''}>
                  <h2 className="font-display text-2xl font-medium text-mountain-900 sm:text-3xl">{section.heading}</h2>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-mountain-600 sm:text-base">{section.body}</p>
                </div>
                {section.imageUrl && <img src={section.imageUrl} alt={section.imageAlt || section.heading} loading="lazy" className={`aspect-[4/3] w-full object-cover ${index % 2 ? 'sm:order-1' : ''}`} />}
              </section>
            ))}
          </div>
        )}

        <section aria-labelledby="founders-heading" className="mx-auto mt-16 max-w-4xl border-y border-cream-300 py-10 sm:mt-20 sm:py-12">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-apricot-600">
              The people behind the store
            </p>
            <h2 id="founders-heading" className="font-display text-2xl font-medium text-mountain-900 sm:text-3xl">
              Meet the Founders
            </h2>
          </div>
          <div className="grid gap-px border border-cream-300 bg-cream-300 sm:grid-cols-3">
            {(pageCopy.founders?.length ? pageCopy.founders : FOUNDERS).map((founder) => (
              <div key={founder.name} className="bg-cream-100 px-5 py-7 text-center sm:px-6">
                <div
                  className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-cream-400 bg-white font-display text-lg text-mountain-700"
                  aria-hidden="true"
                >
                  {founder.name.split(' ').map((part) => part[0]).join('')}
                </div>
                <h3 className="font-display text-lg font-medium text-mountain-900">{founder.name}</h3>
                <p className="mt-1 text-sm text-mountain-500">{founder.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 text-center sm:mt-16">
          <h2 className="font-display text-2xl font-medium text-mountain-900 sm:text-3xl">
            Explore the collection
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-mountain-600">
            Browse products from Gilgit-Baltistan or contact our team if you have a question.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="inline-flex min-h-11 items-center justify-center border border-mountain-900 bg-mountain-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-mountain-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2"
            >
              Shop the collection
            </Link>
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center justify-center border border-cream-400 px-6 py-3 text-sm font-semibold text-mountain-800 transition-colors hover:border-mountain-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot-500 focus-visible:ring-offset-2"
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
