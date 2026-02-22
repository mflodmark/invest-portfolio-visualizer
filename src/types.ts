export type Holding = {
  symbol: string;
  name: string;
  logoUrl: string;
  marketValueUsd: number;
  category: 'stock' | 'etf' | 'crypto' | 'cash' | 'bond';
  brandColor?: string;
  textColor?: string;
  currency?: string;
};

export type HoldingWithWeight = Holding & {
  weight: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
