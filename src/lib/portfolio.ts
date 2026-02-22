import type { Holding, HoldingWithWeight } from '../types';

export async function getPortfolio(): Promise<HoldingWithWeight[]> {
  const response = await fetch('/portfolio.json');
  if (!response.ok) {
    throw new Error('Unable to load portfolio data.');
  }

  const holdings = (await response.json()) as Holding[];
  return normalizeHoldings(holdings);
}

type BrokerCsvRow = {
  Namn: string;
  Ticker: string;
  Typ: string;
  Marknad: string;
  Valuta: string;
  ['Värde']: string;
};

export function parseBrokerCsv(csvText: string): {
  holdings: HoldingWithWeight[];
  currency: string;
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing rows.');
  }

  const headers = parseCsvLine(lines[0]);
  const requiredColumns = ['Namn', 'Ticker', 'Typ', 'Marknad', 'Valuta', 'Värde'];
  for (const column of requiredColumns) {
    if (!headers.includes(column)) {
      throw new Error(`CSV is missing required column: ${column}`);
    }
  }

  const rows = lines
    .slice(1)
    .map((line) => parseCsvLine(line))
    .filter((row) => row.length > 1)
    .map((row) => asRecord(headers, row) as BrokerCsvRow);

  const holdings = rows.map((row) => {
    const marketValueUsd = parseNumericValue(row['Värde']);
    const symbol = sanitizeSymbol(row.Ticker || row.Namn);
    return {
      symbol,
      name: row.Namn,
      logoUrl: getLogoUrl(symbol),
      marketValueUsd,
      category: inferCategory(row.Typ, row.Namn),
    } satisfies Holding;
  });

  const currency = rows[0]?.Valuta?.trim() || 'SEK';
  return { holdings: normalizeHoldings(holdings), currency };
}

function normalizeHoldings(holdings: Holding[]): HoldingWithWeight[] {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValueUsd, 0);

  return holdings
    .filter((holding) => holding.marketValueUsd > 0)
    .map((holding) => ({
      ...holding,
      weight: totalValue === 0 ? 0 : holding.marketValueUsd / totalValue,
    }))
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function asRecord(headers: string[], values: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = (values[index] || '').trim();
  });
  return record;
}

function parseNumericValue(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeSymbol(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]/g, '').toUpperCase();
}

function inferCategory(rawType: string, rawName: string): Holding['category'] {
  const type = rawType.toLowerCase();
  const name = rawName.toLowerCase();
  if (type.includes('etf') || name.includes('etf')) {
    return 'etf';
  }
  if (name.includes('bitcoin') || name.includes('ethereum') || name.includes('crypto')) {
    return 'crypto';
  }
  if (name.includes('cash') || name.includes('konto')) {
    return 'cash';
  }
  if (type.includes('obligation') || type.includes('bond') || name.includes('bond')) {
    return 'bond';
  }
  return 'stock';
}

function getLogoUrl(symbol: string): string {
  return `https://placehold.co/80x80/0f172a/f8fafc?text=${encodeURIComponent(symbol)}`;
}
