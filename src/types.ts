export type Holding = {
  symbol: string;
  name: string;
  logoUrl: string;
  marketValueUsd: number;
  category: 'stock' | 'etf' | 'crypto' | 'cash' | 'bond';
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
