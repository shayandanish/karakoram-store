// ── Admin Logo & Branding Page ────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/ui/SEO';
import SiteLogoMark from '../../components/ui/SiteLogoMark';
import { cloudinaryImage } from '../../lib/utils';
import {
  SITE_SETTINGS_QUERY_KEY,
  useSiteSettings,
} from '../../hooks/useSiteSettings';

const createStoreForm = (settings) => ({
  storeName: settings.storeName,
  storeTagline: settings.storeTagline,
  storeDescription: settings.storeDescription,
  shippingFee: String(settings.shippingFee),
  deliveryMinDays: String(settings.deliveryMinDays ?? 2),
  deliveryMaxDays: String(settings.deliveryMaxDays ?? 5),
  deliveryZones: (settings.deliveryZones || []).map((zone) => ({
    ...zone,
    citiesText: (zone.cities || []).join(', '),
    provincesText: (zone.provinces || []).join(', '),
    shippingFee: String(zone.shippingFee),
    minDays: String(zone.minDays),
    maxDays: String(zone.maxDays),
  })),
  paymentMethods: settings.paymentMethods.map((method) => ({ ...method })),
  whatsappNumber: settings.whatsappNumber,
  contactPhone: settings.contactPhone,
  contactEmail: settings.contactEmail,
  enableCustomerWhatsApp: settings.enableCustomerWhatsApp,
  enableCustomerEmail: settings.enableCustomerEmail,
});

const DEFAULT_SOCIAL_LABELS = ['Instagram', 'Facebook', 'YouTube', 'TikTok'];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const isAdministrator = user?.role === 'admin';
  const { logo, settings, isLoading, isError, error, refetch } = useSiteSettings();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [storeForm, setStoreForm] = useState(null);
  const [pageForm, setPageForm] = useState(null);
  const [savingPageContent, setSavingPageContent] = useState(false);
  const formValues = storeForm || createStoreForm(settings);
  const pageValues = pageForm || settings.pageContent;
  useEffect(() => {
    if (!pageForm && settings.pageContent) setPageForm(settings.pageContent);
  }, [settings.pageContent, pageForm]);
  const hasUnsavedPageContent = Boolean(pageForm && JSON.stringify(pageForm) !== JSON.stringify(settings.pageContent));
  const hasUnsavedSettings = Boolean(
    storeForm && JSON.stringify(formValues) !== JSON.stringify(createStoreForm(settings))
  );

  const publishLogo = async (nextLogo) => {
    const { data } = await api.put('/admin/settings', { logo: nextLogo });
    queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, data);
  };

  const handleFilePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    let uploaded = null;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await api.post('/admin/upload?folder=branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploaded = data;

      await publishLogo({
        url: data.url,
        publicId: data.publicId,
        alt: logo.alt || settings.storeName,
      });

      toast.success('Logo updated successfully.');
    } catch (err) {
      // If the upload succeeded but saving failed, remove the orphaned file.
      if (uploaded?.publicId) {
        await api.delete('/admin/upload', { data: { publicId: uploaded.publicId } }).catch(() => {});
      }
      toast.error(err?.response?.data?.message || 'Could not update the logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!logo.url) return;

    setRemoving(true);
    try {
      const { data } = await api.put('/admin/settings', {
        logo: { url: '', publicId: '', alt: settings.storeName },
      });
      queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, data);
      toast.success('Logo removed. The default K mark is active again.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove the logo.');
    } finally {
      setRemoving(false);
    }
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();
    if (!formValues.storeName.trim()) {
      toast.error('Store name is required.');
      return;
    }
    const shippingFee = Number(formValues.shippingFee);
    if (
      formValues.shippingFee.trim() === '' ||
      !Number.isFinite(shippingFee) ||
      shippingFee < 0 ||
      shippingFee > 100000
    ) {
      toast.error('Shipping fee must be between Rs. 0 and Rs. 100,000.');
      return;
    }

    const deliveryMinDays = Number(formValues.deliveryMinDays);
    const deliveryMaxDays = Number(formValues.deliveryMaxDays);
    if (
      !Number.isInteger(deliveryMinDays) ||
      !Number.isInteger(deliveryMaxDays) ||
      deliveryMinDays < 1 ||
      deliveryMaxDays < deliveryMinDays ||
      deliveryMaxDays > 60
    ) {
      toast.error('Set a valid delivery estimate between 1 and 60 days.');
      return;
    }

    const deliveryZones = formValues.deliveryZones.map((zone) => ({
      id: zone.id,
      name: zone.name.trim(),
      cities: zone.citiesText.split(',').map((value) => value.trim()).filter(Boolean),
      provinces: zone.provincesText.split(',').map((value) => value.trim()).filter(Boolean),
      shippingFee: Number(zone.shippingFee),
      minDays: Number(zone.minDays),
      maxDays: Number(zone.maxDays),
      enabled: zone.enabled,
    }));
    const invalidZone = deliveryZones.find((zone) =>
      !zone.name ||
      (!zone.cities.length && !zone.provinces.length) ||
      !Number.isFinite(zone.shippingFee) ||
      zone.shippingFee < 0 ||
      !Number.isInteger(zone.minDays) ||
      !Number.isInteger(zone.maxDays) ||
      zone.minDays < 1 ||
      zone.maxDays < zone.minDays ||
      zone.maxDays > 60
    );
    if (invalidZone) {
      toast.error(`Check the name, matching location, rate, and delivery estimate for "${invalidZone.name || 'new zone'}".`);
      return;
    }

    setSavingSettings(true);
    try {
      const { data } = await api.put('/admin/settings', {
        ...formValues,
        shippingFee,
        deliveryMinDays,
        deliveryMaxDays,
        deliveryZones,
      });
      queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, data);
      setStoreForm(null);
      toast.success('Store settings updated.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save store settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateStoreField = (field) => (event) => {
    setStoreForm((current) => ({
      ...(current || createStoreForm(settings)),
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  };

  const updatePageField = (section, field) => (event) => {
    setPageForm((current) => ({ ...current, [section]: { ...current[section], [field]: event.target.value } }));
  };

  const updateFounder = (index, field) => (event) => {
    setPageForm((current) => ({
      ...current,
      about: { ...current.about, founders: current.about.founders.map((founder, i) => i === index ? { ...founder, [field]: event.target.value } : founder) },
    }));
  };

  const updateStorySection = (index, field, value) => setPageForm((current) => ({ ...current, about: { ...current.about, sections: current.about.sections.map((section, i) => i === index ? { ...section, [field]: value } : section) } }));
  const addStorySection = () => setPageForm((current) => ({ ...current, about: { ...current.about, sections: [...current.about.sections, { heading: '', body: '', imageUrl: '', imageAlt: '' }] } }));
  const removeStorySection = (index) => setPageForm((current) => ({ ...current, about: { ...current.about, sections: current.about.sections.filter((_, i) => i !== index) } }));
  const uploadStoryImage = async (index, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/admin/upload?folder=branding', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateStorySection(index, 'imageUrl', data.url);
      toast.success('Story image uploaded. Save page content to publish it.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not upload the story image.');
    }
  };

  const moveHomeSection = (index, delta) => setPageForm((current) => {
    const order = [...current.home.sectionOrder];
    const next = index + delta;
    if (next < 0 || next >= order.length) return current;
    [order[index], order[next]] = [order[next], order[index]];
    return { ...current, home: { ...current.home, sectionOrder: order } };
  });

  const toggleHomeSection = (key) => setPageForm((current) => ({ ...current, home: { ...current.home, visibility: { ...current.home.visibility, [key]: !current.home.visibility[key] } } }));
  const moveNavigationLink = (index, delta) => setPageForm((current) => {
    const order = [...current.navigation.order];
    const next = index + delta;
    if (next < 0 || next >= order.length) return current;
    [order[index], order[next]] = [order[next], order[index]];
    return { ...current, navigation: { ...current.navigation, order } };
  });

  const updateContentField = (section, field) => (event) => setPageForm((current) => ({ ...current, [section]: { ...current[section], [field]: event.target.value } }));

  const socialLinks = DEFAULT_SOCIAL_LABELS.map((label) => pageValues.footer.socialLinks.find((link) => link.label === label) || { label, url: '' });
  const updateSocialLink = (index, value) => setPageForm((current) => ({ ...current, footer: { ...current.footer, socialLinks: socialLinks.map((link, i) => i === index ? { ...link, url: value } : link) } }));

  const savePageContent = async (event) => {
    event.preventDefault();
    setSavingPageContent(true);
    try {
      const payload = { ...pageValues, footer: { ...pageValues.footer, socialLinks: pageValues.footer.socialLinks.filter((link) => link.url?.trim()) } };
      const { data } = await api.put('/admin/settings', { pageContent: payload, contactEmail: payload.footer.contactEmail, whatsappNumber: payload.footer.whatsappNumber });
      queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, data);
      setPageForm(data.pageContent);
      toast.success('Page content updated.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save page content.');
    } finally {
      setSavingPageContent(false);
    }
  };

  const updatePaymentMethod = (id, field) => (event) => {
    const value = field === 'enabled' ? event.target.checked : event.target.value;
    setStoreForm((current) => {
      const next = current || createStoreForm(settings);
      return {
        ...next,
        paymentMethods: next.paymentMethods.map((method) =>
          method.id === id ? { ...method, [field]: value } : method
        ),
      };
    });
  };

  const updateDeliveryZone = (id, field) => (event) => {
    const value = field === 'enabled' ? event.target.checked : event.target.value;
    setStoreForm((current) => {
      const next = current || createStoreForm(settings);
      return {
        ...next,
        deliveryZones: next.deliveryZones.map((zone) =>
          zone.id === id ? { ...zone, [field]: value } : zone
        ),
      };
    });
  };

  const addDeliveryZone = () => {
    const id = globalThis.crypto?.randomUUID?.() || `zone-${Date.now()}`;
    setStoreForm((current) => {
      const next = current || createStoreForm(settings);
      return {
        ...next,
        deliveryZones: [
          ...next.deliveryZones,
          {
            id,
            name: '',
            citiesText: '',
            provincesText: '',
            shippingFee: String(settings.shippingFee),
            minDays: String(settings.deliveryMinDays ?? 2),
            maxDays: String(settings.deliveryMaxDays ?? 5),
            enabled: true,
          },
        ],
      };
    });
  };

  const removeDeliveryZone = (id) => {
    setStoreForm((current) => {
      const next = current || createStoreForm(settings);
      return { ...next, deliveryZones: next.deliveryZones.filter((zone) => zone.id !== id) };
    });
  };

  const moveDeliveryZone = (id, offset) => {
    setStoreForm((current) => {
      const next = current || createStoreForm(settings);
      const index = next.deliveryZones.findIndex((zone) => zone.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= next.deliveryZones.length) return next;
      const deliveryZones = [...next.deliveryZones];
      [deliveryZones[index], deliveryZones[target]] = [deliveryZones[target], deliveryZones[index]];
      return { ...next, deliveryZones };
    });
  };

  return (
    <div className="space-y-6">
      <SEO title="Store Settings — Admin" />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
          Store Settings
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {isAdministrator ? 'Manage public store details, delivery pricing, payment instructions, and branding.' : 'Manage homepage, Our Story, contact, and footer content.'}
        </p>
        {isAdministrator && <nav aria-label="Settings sections" className="mt-4 flex flex-wrap gap-2">
          <a href="#store-details" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-apricot-300">
            Store details
          </a>
          <a href="#checkout-payments" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-apricot-300">
            Checkout payments
          </a>
          <a href="#delivery-rates" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-apricot-300">
            Delivery rates
          </a>
          <a href="#page-content" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-apricot-300">
            Page content
          </a>
          {hasUnsavedSettings && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800" role="status">
              Unsaved changes
            </span>
          )}
          {!hasUnsavedSettings && !isLoading && !isError && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700" role="status">
              Settings up to date
            </span>
          )}
        </nav>}
      </div>

      {isError && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <span>Could not load store settings: {error?.response?.data?.message || error?.message}</span>
          <button type="button" onClick={() => refetch()} className="shrink-0 text-xs font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        {/* Main upload card */}
        <section className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-lg text-mountain-900">Store logo</h2>
              <p className="text-sm text-stone-500 mt-1 max-w-lg">
                The storefront places your logo on a soft apricot brand tile, so white or
                cream backgrounds blend in. A square PNG or WebP gives the crispest result,
                and changes are published as soon as the upload finishes.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                logo.url
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-stone-100 border-stone-200 text-stone-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${logo.url ? 'bg-emerald-500' : 'bg-stone-400'}`} />
              {logo.url ? 'Custom logo active' : 'Default mark'}
            </span>
          </div>

          <div className="mt-6 min-h-[260px] rounded-2xl border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center p-8 overflow-hidden">
            {isLoading ? (
              <div className="w-10 h-10 rounded-full border-2 border-apricot-500 border-t-transparent animate-spin" />
            ) : logo.url ? (
              <img
                src={cloudinaryImage(logo.url, {
                  width: 384,
                  height: 192,
                  crop: 'limit',
                  quality: 'auto:good',
                  format: 'auto',
                })}
                alt={logo.alt || settings.storeName}
                width={384}
                height={192}
                loading="lazy"
                decoding="async"
                className="max-h-44 max-w-full object-contain drop-shadow-sm"
              />
            ) : (
              <div className="text-center">
                <SiteLogoMark
                  size={logo.url ? '5xl' : '3xl'}
                  maxWidthClass={logo.url ? 'max-w-[16rem]' : 'max-w-[12rem]'}
                  className="mx-auto mb-3"
                />
                <p className="text-xs text-stone-500">Default K mark</p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFilePick}
            className="hidden"
          />

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading || isError || uploading || removing}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-apricot-500 hover:bg-apricot-400 text-white text-sm font-semibold rounded-2xl shadow-sm transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {logo.url ? 'Replace Logo' : 'Upload Logo'}
                </>
              )}
            </button>

            {logo.url && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isLoading || isError || uploading || removing}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-rose-50 text-rose-600 text-sm font-semibold rounded-2xl border border-rose-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {removing ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                    Removing…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Remove Logo
                  </>
                )}
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-stone-400">
            JPG, PNG or WebP · maximum 5 MB. Changes are published immediately.
          </p>
        </section>

        {/* Preview / help */}
        <aside className="space-y-6">
          <section className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6">
            <h2 className="font-display font-bold text-lg text-mountain-900">Live preview</h2>
            <p className="text-sm text-stone-500 mt-1">
              This is how the logo appears with your store branding.
            </p>

            <div className="mt-4 rounded-2xl bg-mountain-900 p-4 flex items-center gap-3">
              <SiteLogoMark
                size={logo.url ? '4xl' : '2xl'}
                maxWidthClass="max-w-[12rem]"
                shadowClass="shadow-lg"
              />
              <div className="min-w-0">
                <div className="font-display font-bold text-lg text-cream-50 leading-tight">
                  {formValues.storeName}
                </div>
                <div className="text-[10px] text-mountain-400 font-medium tracking-widest uppercase">
                  {formValues.storeTagline}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-cream-100 p-4 flex items-center gap-3 border border-cream-200">
              <SiteLogoMark
                size={logo.url ? '4xl' : 'xl'}
                maxWidthClass="max-w-[12rem]"
              />
              <div className="min-w-0">
                <div className="font-display font-bold text-mountain-900 text-sm">{formValues.storeName}</div>
                <div className="text-apricot-600 text-[10px] font-semibold tracking-widest uppercase">
                {formValues.storeTagline}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-stone-500 leading-relaxed">
              The same logo is used in the navbar, footer, sign-in pages, and admin sidebar.
            </p>
          </section>

          <section className="bg-apricot-50 border border-apricot-200 rounded-3xl p-6">
            <h2 className="font-display font-bold text-base text-mountain-900">Tips for a crisp logo</h2>
            <ul className="mt-3 space-y-2 text-xs text-stone-600 leading-relaxed">
              <li>• The logo is automatically blended onto the apricot brand tile.</li>
              <li>• Transparent PNG or WebP gives the crispest result.</li>
              <li>• Square images work best for the compact header mark.</li>
              <li>• Wide images are supported, but they will be scaled to fit the header.</li>
            </ul>
          </section>
        </aside>
      </div>

      {isAdministrator && <form
        onSubmit={handleSettingsSubmit}
        id="store-details"
        className="bg-white rounded-3xl border border-stone-200 shadow-xs p-6 sm:p-8"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-mountain-900">Store details</h2>
            <p className="text-sm text-stone-500 mt-1">
              These values appear in checkout, order confirmations, and public contact details.
            </p>
          </div>
          <button
            type="submit"
            disabled={!hasUnsavedSettings || savingSettings || isLoading || isError}
            className="mt-4 sm:mt-0 inline-flex justify-center rounded-xl bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-apricot-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingSettings ? 'Saving…' : 'Save Store Settings'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            { name: 'storeName', label: 'Store name', maxLength: 120 },
            { name: 'storeTagline', label: 'Brand tagline', maxLength: 160 },
            { name: 'shippingFee', label: 'Fallback shipping fee (PKR)', type: 'number', min: '0', max: '100000', step: '1' },
            { name: 'whatsappNumber', label: 'WhatsApp number', inputMode: 'tel' },
            { name: 'contactPhone', label: 'Public contact phone', inputMode: 'tel' },
            { name: 'contactEmail', label: 'Public contact email', type: 'email' },
          ].map(({ name, label, ...inputProps }) => (
            <label key={name} className="block text-sm font-medium text-stone-700">
              {label}
              <input
                {...inputProps}
                value={formValues[name]}
                onChange={updateStoreField(name)}
                disabled={isLoading || isError || savingSettings}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-apricot-400 focus:bg-white focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
              />
            </label>
          ))}
          <label className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 sm:col-span-2"><input type="checkbox" checked={Boolean(formValues.enableCustomerWhatsApp)} onChange={updateStoreField('enableCustomerWhatsApp')} disabled={isLoading || isError || savingSettings} className="mt-0.5 h-4 w-4 rounded border-stone-300 text-apricot-600 focus:ring-apricot-500" /><span><span className="block font-semibold text-mountain-900">Enable customer WhatsApp order updates</span><span className="mt-1 block text-xs text-stone-500">Only sends when the customer also opts in at checkout. Requires Meta WhatsApp Cloud API credentials on the server.</span></span></label>
          <label className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 sm:col-span-2"><input type="checkbox" checked={Boolean(formValues.enableCustomerEmail)} onChange={updateStoreField('enableCustomerEmail')} disabled={isLoading || isError || savingSettings} className="mt-0.5 h-4 w-4 rounded border-stone-300 text-apricot-600 focus:ring-apricot-500" /><span><span className="block font-semibold text-mountain-900">Enable customer order emails</span><span className="mt-1 block text-xs text-stone-500">Controls order confirmations, status updates, and payment reminders. Login verification and password reset emails are unaffected.</span></span></label>
          <label className="block text-sm font-medium text-stone-700 sm:col-span-2">
            Store description
            <textarea
              value={formValues.storeDescription}
              onChange={updateStoreField('storeDescription')}
              maxLength={500}
              rows={3}
              disabled={isLoading || isError || savingSettings}
              className="mt-1.5 w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-apricot-400 focus:bg-white focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
            />
          </label>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-6">
          <section id="delivery-rates">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-mountain-900">Delivery rates & estimates</h3>
                <p className="mt-1 text-sm text-stone-500">
                  Match a city, province, or both. The first matching active zone sets the checkout rate; unmatched addresses use the flat fallback.
                </p>
              </div>
              <button
                type="button"
                onClick={addDeliveryZone}
                disabled={isLoading || isError || savingSettings}
                className="shrink-0 rounded-xl border border-apricot-300 bg-apricot-50 px-4 py-2.5 text-sm font-semibold text-apricot-800 transition hover:bg-apricot-100 disabled:opacity-60"
              >
                Add delivery zone
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-stone-700">
                Default minimum delivery days
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={formValues.deliveryMinDays}
                  onChange={updateStoreField('deliveryMinDays')}
                  disabled={isLoading || isError || savingSettings}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-apricot-400 focus:bg-white focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Default maximum delivery days
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={formValues.deliveryMaxDays}
                  onChange={updateStoreField('deliveryMaxDays')}
                  disabled={isLoading || isError || savingSettings}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-apricot-400 focus:bg-white focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                />
              </label>
            </div>

            {formValues.deliveryZones.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                No delivery zones yet. Checkout will use the flat shipping fee and default delivery estimate.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {formValues.deliveryZones.map((zone, index) => (
                  <section key={zone.id} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
                          <input
                            type="checkbox"
                            checked={zone.enabled}
                            onChange={updateDeliveryZone(zone.id, 'enabled')}
                            disabled={isLoading || isError || savingSettings}
                            className="h-4 w-4 rounded border-stone-300 text-apricot-600 focus:ring-apricot-400"
                          />
                          Active zone
                        </label>
                        <span className="text-xs text-stone-500">Priority {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveDeliveryZone(zone.id, -1)}
                          disabled={index === 0 || isLoading || isError || savingSettings}
                          aria-label={`Move ${zone.name || 'zone'} up in priority`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-white disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDeliveryZone(zone.id, 1)}
                          disabled={index === formValues.deliveryZones.length - 1 || isLoading || isError || savingSettings}
                          aria-label={`Move ${zone.name || 'zone'} down in priority`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-white disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDeliveryZone(zone.id)}
                          disabled={isLoading || isError || savingSettings}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ['name', 'Zone name', 'text'],
                        ['shippingFee', 'Delivery fee (PKR)', 'number'],
                        ['citiesText', 'Cities (comma-separated)', 'text'],
                        ['provincesText', 'Provinces (comma-separated)', 'text'],
                        ['minDays', 'Minimum delivery days', 'number'],
                        ['maxDays', 'Maximum delivery days', 'number'],
                      ].map(([field, label, type]) => (
                        <label key={field} className="block text-xs font-medium text-stone-600">
                          {label}
                          <input
                            type={type}
                            min={type === 'number' ? (field === 'shippingFee' ? '0' : '1') : undefined}
                            max={type === 'number' ? (field === 'shippingFee' ? '100000' : '60') : undefined}
                            step={type === 'number' ? '1' : undefined}
                            value={zone[field]}
                            onChange={updateDeliveryZone(zone.id, field)}
                            disabled={isLoading || isError || savingSettings}
                            placeholder={
                              field === 'citiesText'
                                ? 'Gilgit, Karimabad'
                                : field === 'provincesText'
                                  ? 'Gilgit-Baltistan'
                                  : ''
                            }
                            className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-apricot-400 focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-stone-500">
                      If both cities and provinces are entered, both must match. If only one is entered, that field determines the zone.
                    </p>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-6">
          <h3 id="checkout-payments" className="font-display font-bold text-lg text-mountain-900">Checkout payment methods</h3>
          <p className="mt-1 text-sm text-stone-500">
            Enable the methods customers may choose at checkout. Manual methods must include an account number or payment instructions.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {formValues.paymentMethods.map((method) => (
              <section key={method.id} className="rounded-2xl border border-stone-200 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <label className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={method.enabled}
                      onChange={updatePaymentMethod(method.id, 'enabled')}
                      disabled={isLoading || isError || savingSettings}
                      className="h-4 w-4 rounded border-stone-300 text-apricot-600 focus:ring-apricot-400"
                    />
                    <span className="font-semibold text-stone-900">{method.name}</span>
                  </label>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    method.enabled
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-stone-100 text-stone-500'
                  }`}>
                    {method.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <label className="mt-4 block text-xs font-medium text-stone-600">
                  Customer-facing name
                  <input
                    value={method.name}
                    onChange={updatePaymentMethod(method.id, 'name')}
                    maxLength={60}
                    disabled={isLoading || isError || savingSettings}
                    className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-apricot-400 focus:outline-none focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                  />
                </label>

                {method.id !== 'cod' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-stone-600">
                      Account name
                      <input
                        value={method.accountName}
                        onChange={updatePaymentMethod(method.id, 'accountName')}
                        maxLength={120}
                        disabled={isLoading || isError || savingSettings}
                        className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-apricot-400 focus:outline-none focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600">
                      Account number / IBAN
                      <input
                        value={method.accountNumber}
                        onChange={updatePaymentMethod(method.id, 'accountNumber')}
                        maxLength={120}
                        disabled={isLoading || isError || savingSettings}
                        className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-apricot-400 focus:outline-none focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                      />
                    </label>
                  </div>
                )}

                <label className="mt-3 block text-xs font-medium text-stone-600">
                  {method.id === 'cod' ? 'Delivery instructions' : 'Payment instructions'}
                  <textarea
                    value={method.instructions}
                    onChange={updatePaymentMethod(method.id, 'instructions')}
                    maxLength={2000}
                    rows={3}
                    disabled={isLoading || isError || savingSettings}
                    className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-apricot-400 focus:outline-none focus:ring-2 focus:ring-apricot-100 disabled:opacity-60"
                  />
                </label>
              </section>
            ))}
          </div>
        </div>

        <div className={`sticky bottom-3 z-20 mt-8 flex flex-col gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between ${
          hasUnsavedSettings
            ? 'border-amber-200 bg-amber-50/95'
            : 'border-stone-200 bg-white/95'
        }`}>
          <p className="text-sm font-medium text-stone-700" role="status">
            {hasUnsavedSettings ? 'You have unpublished settings changes.' : 'All settings are saved.'}
          </p>
          <div className="flex gap-2">
            {hasUnsavedSettings && (
              <button
                type="button"
                onClick={() => setStoreForm(null)}
                disabled={savingSettings}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                Discard changes
              </button>
            )}
            <button
              type="submit"
              disabled={!hasUnsavedSettings || savingSettings || isLoading || isError}
              className="inline-flex min-w-36 justify-center rounded-xl bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-apricot-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </form>}

      <form id="page-content" onSubmit={savePageContent} className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-display text-xl font-bold text-mountain-900">Homepage & Our Story content</h2><p className="mt-1 text-sm text-stone-500">Edit the storefront text and founding team. Changes publish when saved.</p></div>
          <button type="submit" disabled={!hasUnsavedPageContent || savingPageContent || isLoading || isError} className="rounded-xl bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingPageContent ? 'Saving…' : 'Save page content'}</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-4"><legend className="px-1 font-semibold text-mountain-900">Announcement bar</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pageValues.announcement.active} onChange={(event) => setPageForm((current) => ({ ...current, announcement: { ...current.announcement, active: event.target.checked } }))} />Show announcement when active</label>
            <label className="block text-sm">Message<input maxLength={240} value={pageValues.announcement.text} onChange={updateContentField('announcement','text')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Link label<input maxLength={60} value={pageValues.announcement.linkLabel} onChange={updateContentField('announcement','linkLabel')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label className="block text-sm">Link URL<input maxLength={500} value={pageValues.announcement.linkUrl} onChange={updateContentField('announcement','linkUrl')} placeholder="/shop" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="block text-xs">Starts at<input type="datetime-local" value={pageValues.announcement.startsAt} onChange={updateContentField('announcement','startsAt')} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" /></label><label className="block text-xs">Ends at<input type="datetime-local" value={pageValues.announcement.endsAt} onChange={updateContentField('announcement','endsAt')} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" /></label></div>
          </fieldset>
          <fieldset className="space-y-3 rounded-xl border border-stone-200 p-4"><legend className="px-1 font-semibold text-mountain-900">Homepage promotion</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pageValues.promotion.active} onChange={(event) => setPageForm((current) => ({ ...current, promotion: { ...current.promotion, active: event.target.checked } }))} />Show promotion when active</label>
            {[['title','Heading',120],['text','Description',300],['imageUrl','Image URL',2048],['linkLabel','Button label',60],['linkUrl','Button URL',500]].map(([field,label,maxLength]) => <label key={field} className="block text-sm">{label}<input maxLength={maxLength} value={pageValues.promotion[field]} onChange={updateContentField('promotion',field)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>)}
            <div className="grid grid-cols-2 gap-3"><label className="block text-xs">Starts at<input type="datetime-local" value={pageValues.promotion.startsAt} onChange={updateContentField('promotion','startsAt')} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" /></label><label className="block text-xs">Ends at<input type="datetime-local" value={pageValues.promotion.endsAt} onChange={updateContentField('promotion','endsAt')} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2" /></label></div>
          </fieldset>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <fieldset className="space-y-4"><legend className="mb-2 font-semibold text-mountain-900">Homepage</legend>
            {[['heroTitle','Hero heading',160],['heroDescription','Hero description',500],['heroButton','Main button label',80],['categoryTitle','Categories heading',100],['featuredTitle','Featured products heading',100]].map(([field,label,maxLength]) => <label key={field} className="block text-sm font-medium text-stone-700">{label}<textarea rows={field.includes('Description') ? 3 : 1} maxLength={maxLength} value={pageValues.home[field]} onChange={updatePageField('home',field)} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm" /></label>)}
            {isAdministrator && <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-semibold text-stone-700">Update homepage images</p><p className="mt-1 text-xs text-stone-500">The hero carousel uses region images; category tiles and featured cards use their own records.</p><div className="mt-3 flex flex-wrap gap-2"><Link to="/admin/cities" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-mountain-800">Region images</Link><Link to="/admin/categories" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-mountain-800">Category images</Link><Link to="/admin/products" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-mountain-800">Product images</Link></div></div>}
          </fieldset>
          <fieldset className="space-y-4"><legend className="mb-2 font-semibold text-mountain-900">Our Story</legend>
            {[['intro','Introduction',500],['story','Story text',3000]].map(([field,label,maxLength]) => <label key={field} className="block text-sm font-medium text-stone-700">{label}<textarea rows={field === 'story' ? 6 : 3} maxLength={maxLength} value={pageValues.about[field]} onChange={updatePageField('about',field)} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm" /></label>)}
            <p className="text-sm font-semibold text-mountain-900">Founders</p>
            {pageValues.about.founders.map((founder,index) => <div key={index} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-stone-600">Name<input maxLength={100} value={founder.name} onChange={updateFounder(index,'name')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-stone-600">Role<input maxLength={60} value={founder.role} onChange={updateFounder(index,'role')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /></label></div>)}
            <div className="space-y-3 border-t border-stone-200 pt-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-mountain-900">Story sections</p><button type="button" onClick={addStorySection} disabled={pageValues.about.sections.length >= 8} className="text-xs font-semibold text-apricot-700 disabled:opacity-50">Add section</button></div>
              {pageValues.about.sections.map((section,index) => <div key={index} className="space-y-2 rounded-xl border border-stone-200 p-3"><div className="flex justify-between"><span className="text-xs font-semibold">Section {index + 1}</span><button type="button" onClick={() => removeStorySection(index)} className="text-xs text-rose-700">Remove</button></div><input aria-label={`Section ${index + 1} heading`} maxLength={120} placeholder="Heading" value={section.heading} onChange={(event) => updateStorySection(index,'heading',event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /><textarea aria-label={`Section ${index + 1} story`} maxLength={3000} rows={3} placeholder="Story text" value={section.body} onChange={(event) => updateStorySection(index,'body',event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /><input aria-label={`Section ${index + 1} image alt text`} maxLength={160} placeholder="Image description (alt text)" value={section.imageAlt} onChange={(event) => updateStorySection(index,'imageAlt',event.target.value)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { uploadStoryImage(index,event.target.files?.[0]); event.target.value = ''; }} className="block w-full text-xs" />{section.imageUrl && <img src={section.imageUrl} alt={section.imageAlt || ''} className="h-28 w-full object-cover" />}</div>)}
            </div>
            <label className="block text-sm text-stone-700">SEO title<input maxLength={120} value={pageValues.about.seoTitle} onChange={updateContentField('about','seoTitle')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">SEO description<textarea maxLength={300} value={pageValues.about.seoDescription} onChange={updateContentField('about','seoDescription')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
          </fieldset>
        </div>
        <div className="grid gap-6 border-t border-stone-200 pt-5 lg:grid-cols-2">
          <fieldset><legend className="mb-3 font-semibold text-mountain-900">Homepage sections</legend><div className="space-y-2">{pageValues.home.sectionOrder.map((section,index) => <div key={section} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm"><label className="flex items-center gap-2 capitalize"><input type="checkbox" checked={section === 'hero' || pageValues.home.visibility[section]} disabled={section === 'hero'} onChange={() => toggleHomeSection(section)} />{section}</label><span className="flex gap-1"><button type="button" disabled={!index} onClick={() => moveHomeSection(index,-1)} aria-label={`Move ${section} up`} className="rounded border px-2 disabled:opacity-40">↑</button><button type="button" disabled={index === pageValues.home.sectionOrder.length - 1} onClick={() => moveHomeSection(index,1)} aria-label={`Move ${section} down`} className="rounded border px-2 disabled:opacity-40">↓</button></span></div>)}</div></fieldset>
          <fieldset className="space-y-3"><legend className="mb-2 font-semibold text-mountain-900">Contact and footer</legend>
            {['intro','responseText'].map((field) => <label key={field} className="block text-sm text-stone-700">{field === 'intro' ? 'Contact page intro' : 'Contact response text'}<textarea maxLength={500} value={pageValues.contact[field]} onChange={updateContentField('contact',field)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>)}
            <label className="block text-sm text-stone-700">Footer introduction<textarea maxLength={300} value={pageValues.footer.intro} onChange={updateContentField('footer','intro')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">Newsletter text<textarea maxLength={300} value={pageValues.footer.newsletterText} onChange={updateContentField('footer','newsletterText')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            {pageValues.contact && <><label className="block text-sm text-stone-700">Contact SEO title<input maxLength={120} value={pageValues.contact.seoTitle} onChange={updateContentField('contact','seoTitle')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label className="block text-sm text-stone-700">Contact SEO description<textarea maxLength={300} value={pageValues.contact.seoDescription} onChange={updateContentField('contact','seoDescription')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label></>}
            <p className="text-sm font-semibold text-mountain-900">Social profile links</p>
            <label className="block text-sm text-stone-700">Footer WhatsApp number<input value={pageValues.footer.whatsappNumber} onChange={updateContentField('footer','whatsappNumber')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">Footer email<input type="email" value={pageValues.footer.contactEmail} onChange={updateContentField('footer','contactEmail')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">Store location<textarea maxLength={300} rows={3} value={pageValues.footer.location} onChange={updateContentField('footer','location')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">Map link<input type="url" value={pageValues.footer.mapUrl} onChange={updateContentField('footer','mapUrl')} placeholder="https://maps.google.com/..." className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            {socialLinks.map((link,index) => <label key={link.label} className="block text-xs font-medium text-stone-600">{link.label} URL<input type="url" value={link.url} onChange={(event) => updateSocialLink(index,event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /></label>)}
          </fieldset>
        </div>
        <div className="grid gap-6 border-t border-stone-200 pt-5 lg:grid-cols-2">
          <fieldset className="space-y-3"><legend className="font-semibold text-mountain-900">Main navigation</legend><p className="text-xs text-stone-500">Reorder links or hide them from the header menu. Hidden pages remain accessible by direct URL.</p>
            {pageValues.navigation.order.map((key,index) => {
              const label = { home: 'Home', shop: 'Shop', trackOrder: 'Track Order', about: 'About', contact: 'Contact' }[key];
              return <div key={key} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2"><label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" checked={pageValues.navigation.visibility[key]} onChange={(event) => setPageForm((current) => ({ ...current, navigation: { ...current.navigation, visibility: { ...current.navigation.visibility, [key]: event.target.checked } } }))} />{label}</label><span className="flex gap-1"><button type="button" disabled={!index} onClick={() => moveNavigationLink(index,-1)} aria-label={`Move ${label} up`} className="rounded border px-2 disabled:opacity-40">↑</button><button type="button" disabled={index === pageValues.navigation.order.length - 1} onClick={() => moveNavigationLink(index,1)} aria-label={`Move ${label} down`} className="rounded border px-2 disabled:opacity-40">↓</button></span></div>;
            })}
          </fieldset>
          <fieldset className="space-y-3"><legend className="font-semibold text-mountain-900">Track Order page</legend>
            <label className="block text-sm text-stone-700">Instructions<textarea maxLength={500} rows={3} value={pageValues.trackOrder.intro} onChange={updateContentField('trackOrder','intro')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">SEO title<input maxLength={120} value={pageValues.trackOrder.seoTitle} onChange={updateContentField('trackOrder','seoTitle')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
            <label className="block text-sm text-stone-700">SEO description<textarea maxLength={300} value={pageValues.trackOrder.seoDescription} onChange={updateContentField('trackOrder','seoDescription')} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
          </fieldset>
        </div>
        <aside aria-label="Page content preview" className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
          <div className="border border-stone-200 bg-stone-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-apricot-700">Homepage preview</p><h3 className="mt-2 font-display text-lg text-mountain-900">{pageValues.home.heroTitle}</h3><p className="mt-1 text-sm text-stone-600">{pageValues.home.heroDescription}</p><span className="mt-3 inline-block bg-mountain-900 px-3 py-1.5 text-xs font-semibold text-white">{pageValues.home.heroButton}</span></div>
          <div className="border border-stone-200 bg-stone-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-apricot-700">Our Story preview</p><h3 className="mt-2 font-display text-lg text-mountain-900">{pageValues.about.intro}</h3><p className="mt-1 line-clamp-3 text-sm text-stone-600">{pageValues.about.story}</p><p className="mt-2 text-xs font-semibold text-stone-700">{pageValues.about.founders.map((founder) => founder.name).join(' · ')}</p></div>
        </aside>
      </form>
    </div>
  );
}
