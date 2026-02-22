import type { Holding } from '../types';

type BrandProfile = {
  logoUrl: string;
  brandColor: string;
  textColor: string;
  category?: Holding['category'];
};

const BRAND_BY_SYMBOL: Record<string, BrandProfile> = {
  ABB: { logoUrl: 'https://logo.clearbit.com/global.abb', brandColor: '#d81f26', textColor: '#ffffff' },
  'ABB LTD': { logoUrl: 'https://logo.clearbit.com/global.abb', brandColor: '#d81f26', textColor: '#ffffff' },
  AMZN: { logoUrl: 'https://logo.clearbit.com/amazon.com', brandColor: '#131a22', textColor: '#ffffff' },
  GOOGL: { logoUrl: 'https://logo.clearbit.com/abc.xyz', brandColor: '#1a73e8', textColor: '#ffffff' },
  GOOG: { logoUrl: 'https://logo.clearbit.com/abc.xyz', brandColor: '#1a73e8', textColor: '#ffffff' },
  IREN: { logoUrl: 'https://logo.clearbit.com/iren.com', brandColor: '#15803d', textColor: '#f8fafc' },
  NBIS: { logoUrl: 'https://logo.clearbit.com/nebius.com', brandColor: '#0f766e', textColor: '#f8fafc' },
  NVDA: { logoUrl: 'https://logo.clearbit.com/nvidia.com', brandColor: '#76b900', textColor: '#04130b' },
  PLTR: { logoUrl: 'https://logo.clearbit.com/palantir.com', brandColor: '#111827', textColor: '#f8fafc' },
  PL: { logoUrl: 'https://logo.clearbit.com/planet.com', brandColor: '#0891b2', textColor: '#f8fafc' },
  PLEJD: { logoUrl: 'https://logo.clearbit.com/plejd.com', brandColor: '#0ea5e9', textColor: '#f8fafc' },
  RBRK: { logoUrl: 'https://logo.clearbit.com/rubrik.com', brandColor: '#06b6d4', textColor: '#082f49' },
  SPOT: { logoUrl: 'https://logo.clearbit.com/spotify.com', brandColor: '#1ed760', textColor: '#052e16' },
  TSM: { logoUrl: 'https://logo.clearbit.com/tsmc.com', brandColor: '#ea580c', textColor: '#fff7ed' },
  TSLA: { logoUrl: 'https://logo.clearbit.com/tesla.com', brandColor: '#cc1f2f', textColor: '#ffffff' },
  VOO: { logoUrl: 'https://logo.clearbit.com/vanguard.com', brandColor: '#b91c1c', textColor: '#ffffff', category: 'etf' },
  BND: { logoUrl: 'https://logo.clearbit.com/vanguard.com', brandColor: '#7c2d12', textColor: '#ffedd5', category: 'bond' },
  BTC: {
    logoUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    brandColor: '#f7931a',
    textColor: '#111827',
    category: 'crypto',
  },
  CASH: { logoUrl: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png', brandColor: '#64748b', textColor: '#f8fafc', category: 'cash' },
};

export function getBranding(symbol: string): BrandProfile {
  const normalized = symbol.toUpperCase();
  return (
    BRAND_BY_SYMBOL[normalized] || {
      logoUrl: `https://placehold.co/80x80/0f172a/f8fafc?text=${encodeURIComponent(normalized)}`,
      brandColor: '#0f172a',
      textColor: '#f8fafc',
    }
  );
}
