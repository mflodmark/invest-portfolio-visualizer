import { useEffect, useMemo, useState } from 'react';
import { getPortfolio } from './lib/portfolio';
import { buildSliceTreemap } from './lib/treemap';
import type { HoldingWithWeight } from './types';

const CATEGORY_COLORS: Record<HoldingWithWeight['category'], string> = {
  stock: '#0d9488',
  etf: '#f97316',
  crypto: '#2563eb',
  cash: '#64748b',
  bond: '#7c3aed',
};

function App() {
  const [holdings, setHoldings] = useState<HoldingWithWeight[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    getPortfolio()
      .then(setHoldings)
      .catch((err: Error) => setError(err.message));
  }, []);

  const layout = useMemo(
    () => buildSliceTreemap(holdings.map((item) => item.weight), { x: 0, y: 0, width: 100, height: 100 }),
    [holdings],
  );

  const total = useMemo(() => holdings.reduce((sum, item) => sum + item.marketValueUsd, 0), [holdings]);

  return (
    <main className="page">
      <header className="header">
        <h1>Portfolio Visualizer</h1>
        <p>Treemap view sized by each investment&apos;s share of your total portfolio.</p>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="treemap" aria-label="Portfolio holding treemap">
        {holdings.map((holding, index) => {
          const rect = layout[index];
          if (!rect) {
            return null;
          }

          const isCompact = rect.width < 14 || rect.height < 18;

          return (
            <article
              className="tile"
              key={holding.symbol}
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: CATEGORY_COLORS[holding.category],
              }}
              title={`${holding.name} (${holding.symbol}) ${formatPercent(holding.weight)} | ${formatCurrency(holding.marketValueUsd)}`}
            >
              <img src={holding.logoUrl} alt={`${holding.name} logo`} className="logo" loading="lazy" />
              <div className="tile-labels">
                <span className="symbol">{holding.symbol}</span>
                {!isCompact ? <span>{formatPercent(holding.weight)}</span> : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="table-wrapper">
        <h2>Holdings</h2>
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Value</th>
              <th>Weight</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={holding.symbol}>
                <td>{holding.name}</td>
                <td>{formatCurrency(holding.marketValueUsd)}</td>
                <td>{formatPercent(holding.weight)}</td>
                <td>{holding.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">Total portfolio value: {formatCurrency(total)}</footer>
    </main>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default App;
