import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

export const SITE_SETTINGS_QUERY_KEY = ['site-settings'];

export const DEFAULT_LOGO = {
  url: '',
  publicId: '',
  alt: '',
};

export const DEFAULT_SETTINGS = {
  logo: DEFAULT_LOGO,
  storeName: 'Karakoram Store',
  storeTagline: 'Authentic · Gilgit-Baltistan · Pakistan',
  storeDescription: 'Handcrafted goods and artisan products from Gilgit-Baltistan, Pakistan.',
  pageContent: {
    announcement: { active: false, text: '', linkLabel: '', linkUrl: '', startsAt: '', endsAt: '' },
    promotion: { active: false, title: '', text: '', imageUrl: '', linkLabel: 'Shop now', linkUrl: '', startsAt: '', endsAt: '' },
    navigation: { order: ['home', 'shop', 'trackOrder', 'about', 'contact'], visibility: { home: true, shop: true, trackOrder: true, about: true, contact: true } },
    trackOrder: { intro: 'Enter your order number and the phone number or email used at checkout.', seoTitle: 'Track Your Order', seoDescription: 'Track your order status, courier information, and delivery progress.' },
    home: { heroTitle: 'Products and craft from Gilgit-Baltistan', heroDescription: 'Discover regional food, artisan goods, and cultural products from across Gilgit-Baltistan.', heroButton: 'Shop all products', categoryTitle: 'Shop by category', featuredTitle: 'New arrivals', sectionOrder: ['hero','categories','featured','promises','regions'], visibility: { categories: true, featured: true, promises: true, regions: true } },
    about: { intro: 'Karakoram Store brings products and handmade goods from Gilgit-Baltistan to customers across Pakistan.', story: 'Gilgit-Baltistan is known for its valleys, local produce, and living craft traditions. Karakoram Store was created to make it easier to discover products connected to this region and order them from across Pakistan.', sections: [], founders: [{ name: 'Shayan Danish', role: 'Founder' }, { name: 'Inam Karim', role: 'Co-founder' }, { name: 'Saif Ullah Baig', role: 'Co-founder' }], seoTitle: 'Our Story', seoDescription: 'Learn about Karakoram Store and the team behind our Gilgit-Baltistan store.' },
    contact: { intro: 'Got a question, need a recommendation, or looking for a special gift? Send us a message and our team will get back to you.', responseText: 'We’re here. Reach out to us directly and our team will respond as soon as possible.', seoTitle: 'Contact Us', seoDescription: 'Get in touch with Karakoram Store about products, orders, or delivery.' },
    footer: { intro: 'We’re here to help. Reach out to us directly and our team will get back to you.', newsletterText: 'Get in touch to hear about new products and updates.', contactEmail: '', whatsappNumber: '', location: 'Zero Point, Karimabad, Sana Khan and Sons Market, Gilgit-Baltistan, Pakistan', mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=36.3191588,74.6664695', socialLinks: [] },
  },
  shippingFee: 200,
  deliveryMinDays: 2,
  deliveryMaxDays: 5,
  deliveryZones: [],
  easypaisaAccountName: 'Shayan Danish',
  easypaisaAccountNumber: '03495144486',
  bankTransferDetails: '',
  paymentMethods: [
    {
      id: 'easypaisa',
      name: 'Easypaisa',
      enabled: true,
      accountName: 'Shayan Danish',
      accountNumber: '03495144486',
      instructions: 'Transfer the order total and provide your transaction ID or payment screenshot.',
    },
    {
      id: 'jazzcash',
      name: 'JazzCash',
      enabled: false,
      accountName: '',
      accountNumber: '',
      instructions: 'Transfer the order total and provide your transaction ID or payment screenshot.',
    },
    {
      id: 'bank_transfer',
      name: 'Bank transfer',
      enabled: false,
      accountName: '',
      accountNumber: '',
      instructions: '',
    },
    {
      id: 'cod',
      name: 'Cash on delivery',
      enabled: true,
      accountName: '',
      accountNumber: '',
      instructions: 'Pay the courier in cash when your order is delivered.',
    },
    {
      id: 'other',
      name: 'Other payment',
      enabled: false,
      accountName: '',
      accountNumber: '',
      instructions: '',
    },
  ],
  whatsappNumber: '923495144486',
  contactPhone: '+923495144486',
  contactEmail: 'hello@karakoramstore.com',
  enableCustomerWhatsApp: false,
  enableCustomerEmail: true,
  enableCod: true,
  enableBankTransfer: false,
  enableEasypaisa: true,
};

export function useSiteSettings() {
  const query = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  const data = { ...DEFAULT_SETTINGS, ...(query.data || {}) };
  data.pageContent = {
    announcement: { ...DEFAULT_SETTINGS.pageContent.announcement, ...(query.data?.pageContent?.announcement || {}) },
    promotion: { ...DEFAULT_SETTINGS.pageContent.promotion, ...(query.data?.pageContent?.promotion || {}) },
    navigation: { ...DEFAULT_SETTINGS.pageContent.navigation, ...(query.data?.pageContent?.navigation || {}), order: query.data?.pageContent?.navigation?.order || DEFAULT_SETTINGS.pageContent.navigation.order, visibility: { ...DEFAULT_SETTINGS.pageContent.navigation.visibility, ...(query.data?.pageContent?.navigation?.visibility || {}) } },
    trackOrder: { ...DEFAULT_SETTINGS.pageContent.trackOrder, ...(query.data?.pageContent?.trackOrder || {}) },
    home: { ...DEFAULT_SETTINGS.pageContent.home, ...(query.data?.pageContent?.home || {}), visibility: { ...DEFAULT_SETTINGS.pageContent.home.visibility, ...(query.data?.pageContent?.home?.visibility || {}) } },
    about: { ...DEFAULT_SETTINGS.pageContent.about, ...(query.data?.pageContent?.about || {}) },
    contact: { ...DEFAULT_SETTINGS.pageContent.contact, ...(query.data?.pageContent?.contact || {}) },
    footer: { ...DEFAULT_SETTINGS.pageContent.footer, ...(query.data?.pageContent?.footer || {}), contactEmail: query.data?.pageContent?.footer?.contactEmail ?? data.contactEmail, whatsappNumber: query.data?.pageContent?.footer?.whatsappNumber ?? data.whatsappNumber },
  };
  const paymentMethods = Array.isArray(data.paymentMethods)
    ? data.paymentMethods
    : DEFAULT_SETTINGS.paymentMethods;

  return {
    ...query,
    settings: data,
    paymentMethods,
    logo: data.logo || DEFAULT_LOGO,
    shippingFee: data.shippingFee ?? 200,
    easypaisaAccountName: data.easypaisaAccountName,
    easypaisaAccountNumber: data.easypaisaAccountNumber,
    bankTransferDetails: data.bankTransferDetails,
    whatsappNumber: data.whatsappNumber,
    contactPhone: data.contactPhone,
    contactEmail: data.contactEmail,
    enableCustomerWhatsApp: data.enableCustomerWhatsApp,
    enableCod: paymentMethods.find((method) => method.id === 'cod')?.enabled ?? data.enableCod !== false,
    enableBankTransfer:
      paymentMethods.find((method) => method.id === 'bank_transfer')?.enabled ??
      Boolean(data.enableBankTransfer),
  };
}
