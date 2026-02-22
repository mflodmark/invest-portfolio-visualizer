import { getBranding } from './branding';
import { supabase } from './supabase';
import type { Holding, HoldingWithWeight } from '../types';

const DEFAULT_PORTFOLIO_NAME = 'Main Portfolio';

type BrokerCsvRow = {
  Namn: string;
  Ticker: string;
  Typ: string;
  Marknad: string;
  Valuta: string;
  ['Värde']: string;
};

type DbHoldingRow = {
  symbol: string;
  name: string;
  logo_url: string | null;
  market_value: number;
  category: Holding['category'];
  brand_color: string | null;
  text_color: string | null;
  currency: string | null;
};

type DbOverrideRow = {
  symbol: string;
  logo_url: string | null;
  brand_color: string | null;
  text_color: string | null;
};

export type BrandOverrideInput = {
  symbol: string;
  logoUrl: string;
  brandColor: string;
  textColor: string;
};

export async function getDemoPortfolio(): Promise<HoldingWithWeight[]> {
  const response = await fetch('/portfolio.json');
  if (!response.ok) {
    throw new Error('Unable to load demo portfolio data.');
  }

  const holdings = (await response.json()) as Holding[];
  return normalizeHoldings(holdings);
}

export async function getPortfolioFromDatabase(userId: string): Promise<{
  holdings: HoldingWithWeight[];
  currency: string;
}> {
  const portfolioId = await getOrCreateDefaultPortfolio(userId);
  const overrides = await getBrandOverrides(userId);
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('holdings')
    .select('symbol,name,logo_url,market_value,category,brand_color,text_color,currency')
    .eq('portfolio_id', portfolioId)
    .order('market_value', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as DbHoldingRow[];
  const holdings = normalizeHoldings(
    rows.map((row) => {
      const defaults = getBranding(row.symbol);
      return {
        ...(applyOverride(
          {
            symbol: row.symbol,
            // Local symbol SVG should be canonical. DB overrides are handled in instrument_overrides.
            logoUrl: defaults.logoUrl,
            brandColor: row.brand_color || defaults.brandColor,
            textColor: row.text_color || defaults.textColor,
          },
          overrides[row.symbol.toUpperCase()],
        )),
        symbol: row.symbol,
        name: row.name,
        marketValueUsd: Number(row.market_value),
        category: row.category,
        currency: row.currency || 'SEK',
      };
    }),
  );

  const currency = rows[0]?.currency || 'SEK';
  return { holdings, currency };
}

export async function saveBrokerCsvToDatabase(userId: string, csvText: string): Promise<{
  holdings: HoldingWithWeight[];
  currency: string;
}> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { holdings, currency } = parseBrokerCsv(csvText);
  const portfolioId = await getOrCreateDefaultPortfolio(userId);

  const { error: deleteError } = await supabase.from('holdings').delete().eq('portfolio_id', portfolioId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (holdings.length > 0) {
    const payload = holdings.map((holding) => ({
      portfolio_id: portfolioId,
      symbol: holding.symbol,
      name: holding.name,
      market_value: holding.marketValueUsd,
      category: holding.category,
      currency,
      logo_url: holding.logoUrl,
      brand_color: holding.brandColor || null,
      text_color: holding.textColor || null,
    }));

    const { error: insertError } = await supabase.from('holdings').insert(payload);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { error: portfolioError } = await supabase
    .from('portfolios')
    .update({ base_currency: currency })
    .eq('id', portfolioId);

  if (portfolioError) {
    throw new Error(portfolioError.message);
  }

  return { holdings, currency };
}

export async function saveBrandOverride(userId: string, input: BrandOverrideInput): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const payload = {
    user_id: userId,
    symbol: input.symbol.toUpperCase(),
    logo_url: input.logoUrl.trim(),
    brand_color: input.brandColor.trim(),
    text_color: input.textColor.trim(),
  };

  const { error } = await supabase
    .from('instrument_overrides')
    .upsert(payload, { onConflict: 'user_id,symbol' });

  if (error) {
    throw new Error(error.message);
  }
}

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
    const branding = getBranding(symbol);
    return {
      symbol,
      name: row.Namn,
      logoUrl: branding.logoUrl,
      marketValueUsd,
      category: branding.category || inferCategory(row.Typ, row.Namn),
      brandColor: branding.brandColor,
      textColor: branding.textColor,
      currency: row.Valuta || 'SEK',
    } satisfies Holding;
  });

  const currency = rows[0]?.Valuta?.trim() || 'SEK';
  return { holdings: normalizeHoldings(holdings), currency };
}

async function getOrCreateDefaultPortfolio(userId: string): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data: existing, error: selectError } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from('portfolios')
    .insert({ user_id: userId, name: DEFAULT_PORTFOLIO_NAME, base_currency: 'SEK' })
    .select('id')
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message || 'Failed to create portfolio.');
  }

  return created.id;
}

async function getBrandOverrides(userId: string): Promise<Record<string, DbOverrideRow>> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('instrument_overrides')
    .select('symbol,logo_url,brand_color,text_color')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  const map: Record<string, DbOverrideRow> = {};
  ((data || []) as DbOverrideRow[]).forEach((row) => {
    map[row.symbol.toUpperCase()] = row;
  });
  return map;
}

function applyOverride(
  base: { symbol: string; logoUrl: string; brandColor: string; textColor: string },
  override?: DbOverrideRow,
): { logoUrl: string; brandColor: string; textColor: string } {
  if (!override) {
    return {
      logoUrl: base.logoUrl,
      brandColor: base.brandColor,
      textColor: base.textColor,
    };
  }

  return {
    logoUrl: override.logo_url || base.logoUrl,
    brandColor: override.brand_color || base.brandColor,
    textColor: override.text_color || base.textColor,
  };
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
  if (type.includes('etf') || name.includes('etf') || type.includes('fond')) {
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
