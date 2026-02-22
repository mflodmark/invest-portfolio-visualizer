# Invest Portfolio Visualizer

TypeScript + React app that visualizes portfolio concentration with a logo treemap.

## Why this visualization

- Treemap makes relative position sizing obvious.
- Each tile scales with holding weight.
- Logos improve at-a-glance recognition.

## Run

```bash
npm install
npm run dev
```

## Data model

The app loads `public/portfolio.json` and computes weights from `marketValueUsd`.

```ts
{
  symbol: string;
  name: string;
  logoUrl: string;
  marketValueUsd: number;
  category: 'stock' | 'etf' | 'crypto' | 'cash' | 'bond';
}
```

## Production data options

1. Brokerage CSV export -> server parser -> `/api/portfolio`
2. Google Sheet + scheduled sync -> `/api/portfolio`
3. Brokerage API provider (if available) -> `/api/portfolio`

Keep frontend unchanged by returning normalized holdings in that endpoint.

## CSV import (broker export)

Use the "Import broker CSV" button in the app and select your exported file.

Required columns:

- `Namn`
- `Ticker`
- `Typ`
- `Marknad`
- `Valuta`
- `Värde`

The importer maps those rows to holdings and computes relative weights automatically.
