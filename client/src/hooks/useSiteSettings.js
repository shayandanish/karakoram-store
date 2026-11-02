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
  shippingFee: 200,
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
