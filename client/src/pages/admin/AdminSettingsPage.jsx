// ── Admin Logo & Branding Page ────────────────────────────────
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useToast } from '../../context/ToastContext';
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
  paymentMethods: settings.paymentMethods.map((method) => ({ ...method })),
  whatsappNumber: settings.whatsappNumber,
  contactPhone: settings.contactPhone,
  contactEmail: settings.contactEmail,
});

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { logo, settings, isLoading, isError, error, refetch } = useSiteSettings();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [storeForm, setStoreForm] = useState(null);
  const formValues = storeForm || createStoreForm(settings);
  const hasUnsavedSettings = Boolean(storeForm);

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

    setSavingSettings(true);
    try {
      const { data } = await api.put('/admin/settings', {
        ...formValues,
        shippingFee,
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
      [field]: event.target.value,
    }));
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

  return (
    <div className="space-y-6">
      <SEO title="Store Settings — Admin" />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
          Store Settings
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage public store details, delivery pricing, payment instructions, and branding.
        </p>
        <nav aria-label="Settings sections" className="mt-4 flex flex-wrap gap-2">
          <a href="#store-details" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-apricot-300">
            Store details
          </a>
          <a href="#checkout-payments" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-apricot-300">
            Checkout payments
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
        </nav>
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

      <form
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
            disabled={savingSettings || isLoading || isError}
            className="mt-4 sm:mt-0 inline-flex justify-center rounded-xl bg-apricot-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-apricot-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingSettings ? 'Saving…' : 'Save Store Settings'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            { name: 'storeName', label: 'Store name', maxLength: 120 },
            { name: 'storeTagline', label: 'Brand tagline', maxLength: 160 },
            { name: 'shippingFee', label: 'Flat shipping fee (PKR)', type: 'number', min: '0', max: '100000', step: '1' },
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
      </form>
    </div>
  );
}
