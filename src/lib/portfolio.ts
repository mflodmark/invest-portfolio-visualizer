import type { Holding, HoldingWithWeight } from '../types';

export async function getPortfolio(): Promise<HoldingWithWeight[]> {
  const response = await fetch('/portfolio.json');
  if (!response.ok) {
    throw new Error('Unable to load portfolio data.');
  }

  const holdings = (await response.json()) as Holding[];
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValueUsd, 0);

  return holdings
    .filter((holding) => holding.marketValueUsd > 0)
    .map((holding) => ({
      ...holding,
      weight: totalValue === 0 ? 0 : holding.marketValueUsd / totalValue,
    }))
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd);
}
