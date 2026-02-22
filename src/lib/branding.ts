import type { Holding } from '../types';

type BrandProfile = {
  logoUrl: string;
  brandColor: string;
  textColor: string;
  category?: Holding['category'];
};

type BrandTheme = Omit<BrandProfile, 'logoUrl'>;

const SYMBOL_ALIAS: Record<string, string> = {
  'ABB LTD': 'ABB',
  ABBLTD: 'ABB',
  GOOGLE: 'GOOGL',
  GOOG: 'GOOGL',
};

const BRAND_BY_SYMBOL: Record<string, BrandTheme> = {
  ABB: { brandColor: '#d81f26', textColor: '#ffffff' },
  AMZN: { brandColor: '#131a22', textColor: '#ffffff' },
  GOOGL: { brandColor: '#1a73e8', textColor: '#ffffff' },
  GOOG: { brandColor: '#1a73e8', textColor: '#ffffff' },
  IREN: { brandColor: '#15803d', textColor: '#f8fafc' },
  NBIS: { brandColor: '#0f766e', textColor: '#f8fafc' },
  NVDA: { brandColor: '#76b900', textColor: '#04130b' },
  PLTR: { brandColor: '#111827', textColor: '#f8fafc' },
  PL: { brandColor: '#0891b2', textColor: '#f8fafc' },
  PLEJD: { brandColor: '#0ea5e9', textColor: '#f8fafc' },
  RBRK: { brandColor: '#06b6d4', textColor: '#082f49' },
  SPOT: { brandColor: '#1ed760', textColor: '#052e16' },
  TSM: { brandColor: '#ea580c', textColor: '#fff7ed' },
  TSLA: { brandColor: '#cc1f2f', textColor: '#ffffff' },
  VOO: { brandColor: '#b91c1c', textColor: '#ffffff', category: 'etf' },
  BND: { brandColor: '#7c2d12', textColor: '#ffedd5', category: 'bond' },
  BTC: { brandColor: '#f7931a', textColor: '#111827', category: 'crypto' },
  CASH: { brandColor: '#64748b', textColor: '#f8fafc', category: 'cash' },
};

export function getBranding(symbol: string): BrandProfile {
  const normalized = resolveSymbolAlias(symbol);
  const logoUrl = getSymbolLogoUrl(normalized);
  const profile = BRAND_BY_SYMBOL[normalized];

  return (
    profile
      ? { ...profile, logoUrl }
      : {
          logoUrl,
          brandColor: '#0f172a',
          textColor: '#f8fafc',
        }
  );
}

export function getSymbolLogoUrl(symbol: string): string {
  return `/logos/${resolveSymbolAlias(symbol)}.svg`;
}

export function getFallbackLogoUrl(symbol: string): string {
  return `https://placehold.co/80x80/0f172a/f8fafc?text=${encodeURIComponent(resolveSymbolAlias(symbol))}`;
}

function resolveSymbolAlias(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  return SYMBOL_ALIAS[normalized] || normalized;
}
