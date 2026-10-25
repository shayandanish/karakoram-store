// ── Contact Page ───────────────────────────────────────────────
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCleanWhatsAppNumber } from '../lib/utils';
import SEO from '../components/ui/SEO';


export default function ContactPage() {
  const wa = getCleanWhatsAppNumber();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    subject: 'Order Inquiry',
    message: '',
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;

    if (wa) {
      const msg =
        `*Customer Inquiry - Karakoram Store*\n\n` +
        `• Name: ${form.name.trim()}\n` +
        `• Phone: ${form.phone.trim() || 'N/A'}\n` +
        `• Subject: ${form.subject}\n` +
        `• Message: ${form.message.trim()}`;
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
    }
    setSent(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Contact Us"
        description="Get in touch with Karakoram Store. Reach out via WhatsApp or phone for order inquiries, wholesale orders, and customer assistance."
      />

      {/* Back to Home Navigation Button */}
      <div className="mb-6">
        <Link
          to="/"
          id="contact-back-btn"
          className="inline-flex items-center gap-2 text-xs font-bold text-mountain-600 hover:text-apricot-600 transition group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-cream-300 flex items-center justify-center text-mountain-700 group-hover:border-apricot-400 group-hover:text-apricot-600 transition shadow-2xs">
            ←
          </span>
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-apricot-100 text-apricot-700 text-xs font-semibold mb-3">
          <span>💬</span> We're Here to Help
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-mountain-900 mb-3">
          Get in Touch
        </h1>
        <p className="text-mountain-600 text-sm max-w-md mx-auto">
          Have questions about our dry fruits, sizing for caps, or delivery times? Send us a message or chat directly on WhatsApp.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contact Information Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-200">
            <h2 className="font-display font-semibold text-mountain-900 text-lg mb-4">
              Direct Support
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <p className="font-semibold text-mountain-800">Dispatch Center</p>
                  <p className="text-mountain-600 text-xs mt-0.5">
                    Zero Point, Karimabad<br />
                    Sana Khan and Sons Market<br />
                    Gilgit-Baltistan, Pakistan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">🚚</span>
                <div>
                  <p className="font-semibold text-mountain-800">Delivery Information</p>
                  <p className="text-mountain-600 text-xs mt-0.5">
                    Flat Rs. 200 delivery across Pakistan (3–5 business days). Payment via Easypaisa.
                  </p>
                </div>
              </div>
            </div>

            {wa && (
              <div className="mt-6 pt-6 border-t border-cream-200">
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Instant WhatsApp Chat
                </a>
              </div>
            )}
          </div>

          <div className="bg-apricot-50 rounded-3xl p-6 border border-apricot-200/60">
            <h3 className="font-display font-semibold text-mountain-900 text-sm mb-2">
              Wholesale & Corporate Gifting
            </h3>
            <p className="text-xs text-mountain-600 leading-relaxed">
              Looking for custom gift boxes of Hunza dry fruits or handcrafted Pakols for an event? Send us a WhatsApp inquiry with your required quantities.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-cream-200">
          <h2 className="font-display font-bold text-2xl text-mountain-900 mb-2">
            Send an Inquiry
          </h2>
          <p className="text-xs text-mountain-500 mb-6">
            Fill out the details below to start a conversation with our Hunza team.
          </p>

          {sent && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold">Thank you for your message!</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Your WhatsApp message has been launched. We will respond promptly.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                  Your Name <span className="text-apricot-500">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Asad Khan"
                  className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
                />
              </div>

              <div>
                <label htmlFor="contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+92 3XX XXXXXXX"
                  className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                Subject
              </label>
              <select
                id="contact-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800"
              >
                <option value="Order Inquiry">Order Inquiry / Tracking</option>
                <option value="Product Details">Product Authenticity & Sizing</option>
                <option value="Wholesale Orders">Wholesale / Bulk Orders</option>
                <option value="General Question">General Feedback</option>
              </select>
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-mountain-700 mb-1">
                Message <span className="text-apricot-500">*</span>
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="How can we assist you today?"
                className="w-full border border-cream-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-apricot-400 bg-white text-mountain-800 placeholder-mountain-300"
              />
            </div>

            <button
              id="contact-submit-btn"
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 bg-apricot-500 hover:bg-apricot-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <span>Send Message</span>
              <span>→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
