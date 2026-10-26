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

const DEFAULT_ALT = 'Karakoram Store';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { logo, isLoading } = useSiteSettings();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const publishLogo = async (nextLogo) => {
    const { data } = await api.put('/admin/settings', { logo: nextLogo });
    queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, data);
    queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
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
        alt: logo.alt || DEFAULT_ALT,
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
        logo: { url: '', publicId: '', alt: DEFAULT_ALT },
      });
      queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: SITE_SETTINGS_QUERY_KEY });
      toast.success('Logo removed. The default K mark is active again.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove the logo.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SEO title="Logo & Branding — Admin" />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-mountain-900 tracking-tight">
          Logo &amp; Branding
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Upload a logo to replace the default K mark across the storefront and admin panel.
        </p>
      </div>

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
                alt={logo.alt || 'Karakoram Store logo'}
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
              disabled={uploading || removing}
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
                disabled={uploading || removing}
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
                  Karakoram Store
                </div>
                <div className="text-[10px] text-mountain-400 font-medium tracking-widest uppercase">
                  Authentic · Gilgit-Baltistan
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-cream-100 p-4 flex items-center gap-3 border border-cream-200">
              <SiteLogoMark
                size={logo.url ? '4xl' : 'xl'}
                maxWidthClass="max-w-[12rem]"
              />
              <div className="min-w-0">
                <div className="font-display font-bold text-mountain-900 text-sm">Karakoram</div>
                <div className="text-apricot-600 text-[10px] font-semibold tracking-widest uppercase">
                  Store
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
    </div>
  );
}
