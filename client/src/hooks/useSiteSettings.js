import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

export const SITE_SETTINGS_QUERY_KEY = ['site-settings'];

export const DEFAULT_LOGO = {
  url: '',
  publicId: '',
  alt: 'Karakoram Store',
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

  return {
    ...query,
    logo: query.data?.logo || DEFAULT_LOGO,
  };
}
