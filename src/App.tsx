import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getDemoPortfolio,
  getPortfolioFromDatabase,
  parseBrokerCsv,
  saveBrandOverride,
  saveBrokerCsvToDatabase,
} from './lib/portfolio';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import { buildSliceTreemap } from './lib/treemap';
import type { HoldingWithWeight } from './types';

const CATEGORY_COLORS: Record<NonNullable<HoldingWithWeight['category']>, string> = {
  stock: '#0d9488',
  etf: '#f97316',
  crypto: '#2563eb',
  cash: '#64748b',
  bond: '#7c3aed',
};

const MAX_VISIBLE_TILES = 12;
const MIN_VISIBLE_WEIGHT = 0.012;

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(hasSupabaseConfig);
  const [holdings, setHoldings] = useState<HoldingWithWeight[]>([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [sourceLabel, setSourceLabel] = useState<string>('Demo data');
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [brandDrafts, setBrandDrafts] = useState<Record<string, { logoUrl: string; brandColor: string; textColor: string }>>({});

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      void loadDemoData(setHoldings, setCurrency, setSourceLabel, setError, setIsLoadingHoldings);
      setAuthLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
      }
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return;
    }

    if (!session?.user?.id) {
      setHoldings([]);
      setSourceLabel('No portfolio loaded');
      return;
    }

    void loadDatabaseData(
      session.user.id,
      setHoldings,
      setCurrency,
      setSourceLabel,
      setError,
      setIsLoadingHoldings,
    );
  }, [session?.user?.id]);

  const treemapData = useMemo(() => buildTreemapData(holdings), [holdings]);
  const layout = useMemo(
    () => buildSliceTreemap(treemapData.tiles.map((item) => item.weight), { x: 0, y: 0, width: 100, height: 100 }),
    [treemapData.tiles],
  );

  const total = useMemo(() => holdings.reduce((sum, item) => sum + item.marketValueUsd, 0), [holdings]);

  useEffect(() => {
    setBrandDrafts((previous) => {
      const next: Record<string, { logoUrl: string; brandColor: string; textColor: string }> = {};
      holdings.forEach((holding) => {
        const existing = previous[holding.symbol];
        next[holding.symbol] = {
          logoUrl: existing?.logoUrl || holding.logoUrl,
          brandColor: existing?.brandColor || holding.brandColor || '#0f172a',
          textColor: existing?.textColor || holding.textColor || '#f8fafc',
        };
      });
      return next;
    });
  }, [holdings]);

  if (authLoading) {
    return <main className="page"><p>Loading authentication...</p></main>;
  }

  if (hasSupabaseConfig && !session) {
    return <AuthGate />;
  }

  return (
    <main className="page">
      <header className="header">
        <h1>Portfolio Visualizer</h1>
        <p>Treemap view sized by each investment&apos;s share of your total portfolio.</p>
      </header>

      <section className="controls">
        <label htmlFor="csv-file" className="file-input-label">
          Import broker CSV
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="file-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            void importCsv(
              file,
              session?.user?.id,
              setHoldings,
              setCurrency,
              setSourceLabel,
              setError,
              setIsLoadingHoldings,
            );
          }}
        />
        <span className="source">{sourceLabel}</span>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            setEditorOpen((value) => !value);
          }}
        >
          {editorOpen ? 'Hide Brand Editor' : 'Open Brand Editor'}
        </button>
        {hasSupabaseConfig && supabase ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              void supabase?.auth.signOut();
            }}
          >
            Sign out
          </button>
        ) : null}
      </section>

      {error ? <p className="error">{error}</p> : null}
      {isLoadingHoldings ? <p>Loading holdings...</p> : null}

      {editorOpen ? (
        <section className="editor-panel">
          <h2>Brand Editor</h2>
          <p>Edit logo URL and brand colors per symbol. Saved to your account when logged in.</p>
          {holdings.length === 0 ? <p>No holdings loaded.</p> : null}
          {holdings.map((holding) => {
            const draft = brandDrafts[holding.symbol];
            if (!draft) {
              return null;
            }

            return (
              <div key={`brand-${holding.symbol}`} className="editor-row">
                <strong>{holding.symbol}</strong>
                <input
                  type="url"
                  value={draft.logoUrl}
                  placeholder="Logo URL"
                  onChange={(event) => {
                    setBrandDrafts((previous) => ({
                      ...previous,
                      [holding.symbol]: {
                        ...previous[holding.symbol],
                        logoUrl: event.target.value,
                      },
                    }));
                  }}
                />
                <input
                  type="text"
                  value={draft.brandColor}
                  placeholder="#RRGGBB"
                  onChange={(event) => {
                    setBrandDrafts((previous) => ({
                      ...previous,
                      [holding.symbol]: {
                        ...previous[holding.symbol],
                        brandColor: event.target.value,
                      },
                    }));
                  }}
                />
                <input
                  type="text"
                  value={draft.textColor}
                  placeholder="#RRGGBB"
                  onChange={(event) => {
                    setBrandDrafts((previous) => ({
                      ...previous,
                      [holding.symbol]: {
                        ...previous[holding.symbol],
                        textColor: event.target.value,
                      },
                    }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    void saveBrand(
                      holding.symbol,
                      session?.user?.id,
                      brandDrafts,
                      setHoldings,
                      setError,
                    );
                  }}
                >
                  Save
                </button>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="treemap" aria-label="Portfolio holding treemap">
        {treemapData.tiles.map((holding, index) => {
          const rect = layout[index];
          if (!rect) {
            return null;
          }

          const showSymbol = rect.width >= 10 && rect.height >= 7;
          const showPercent = rect.width >= 15 && rect.height >= 11;

          return (
            <article
              className="tile"
              key={holding.symbol}
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: holding.brandColor || CATEGORY_COLORS[holding.category],
                color: holding.textColor || '#f8fafc',
              }}
              title={`${holding.name} (${holding.symbol}) ${formatPercent(holding.weight)} | ${formatCurrency(holding.marketValueUsd, currency)}`}
            >
              <div className="tile-labels">
                {showSymbol ? <span className="symbol">{holding.symbol}</span> : null}
                {showPercent ? <span>{formatPercent(holding.weight)}</span> : null}
              </div>
            </article>
          );
        })}
      </section>

      {treemapData.otherConstituents.length > 0 ? (
        <section className="other-breakdown">
          <h2>Other Holdings</h2>
          <details open>
            <summary>
              {treemapData.otherConstituents.length} positions grouped into OTHER (
              {formatPercent(treemapData.otherWeight)})
            </summary>
            <ul>
              {treemapData.otherConstituents.map((holding) => (
                <li key={`other-${holding.symbol}`}>
                  <span>{holding.symbol}</span>
                  <span>{formatPercent(holding.weight)}</span>
                  <span>{formatCurrency(holding.marketValueUsd, currency)}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

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
                <td>{formatCurrency(holding.marketValueUsd, currency)}</td>
                <td>{formatPercent(holding.weight)}</td>
                <td>{holding.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">Total portfolio value: {formatCurrency(total, currency)}</footer>
    </main>
  );
}

function AuthGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  if (!supabase) {
    return (
      <main className="page auth-card">
        <p>Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to use login and cloud storage.</p>
      </main>
    );
  }

  return (
    <main className="page auth-card">
      <h1>Sign in</h1>
      <p>Use your account to store holdings and branded tiles securely.</p>
      <label htmlFor="email-input">Email</label>
      <input id="email-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="password-input">Password</label>
      <input
        id="password-input"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <div className="auth-buttons">
        <button
          type="button"
          onClick={() => {
            void signInWithPassword(email, password, setMessage);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            void signUpWithPassword(email, password, setMessage);
          }}
        >
          Create account
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            void supabase?.auth.signInWithOAuth({ provider: 'google' });
          }}
        >
          Continue with Google
        </button>
      </div>
      {message ? <p className="error">{message}</p> : null}
    </main>
  );
}

async function loadDemoData(
  setHoldings: (holdings: HoldingWithWeight[]) => void,
  setCurrency: (currency: string) => void,
  setSourceLabel: (source: string) => void,
  setError: (message: string) => void,
  setIsLoadingHoldings: (value: boolean) => void,
): Promise<void> {
  try {
    setIsLoadingHoldings(true);
    const demo = await getDemoPortfolio();
    setHoldings(demo);
    setCurrency('USD');
    setSourceLabel('Demo data (no Supabase configured)');
    setError('');
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to load demo data.');
  } finally {
    setIsLoadingHoldings(false);
  }
}

async function loadDatabaseData(
  userId: string,
  setHoldings: (holdings: HoldingWithWeight[]) => void,
  setCurrency: (currency: string) => void,
  setSourceLabel: (source: string) => void,
  setError: (message: string) => void,
  setIsLoadingHoldings: (value: boolean) => void,
): Promise<void> {
  try {
    setIsLoadingHoldings(true);
    const { holdings, currency } = await getPortfolioFromDatabase(userId);
    setHoldings(holdings);
    setCurrency(currency);
    setSourceLabel('Supabase portfolio');
    setError('');
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to load database holdings.');
  } finally {
    setIsLoadingHoldings(false);
  }
}

async function importCsv(
  file: File,
  userId: string | undefined,
  setHoldings: (holdings: HoldingWithWeight[]) => void,
  setCurrency: (currency: string) => void,
  setSourceLabel: (source: string) => void,
  setError: (message: string) => void,
  setIsLoadingHoldings: (value: boolean) => void,
): Promise<void> {
  try {
    setIsLoadingHoldings(true);
    const csvText = await file.text();

    if (userId) {
      const { holdings, currency } = await saveBrokerCsvToDatabase(userId, csvText);
      setHoldings(holdings);
      setCurrency(currency);
      setSourceLabel(`${file.name} (saved)`);
      setError('');
      return;
    }

    const { holdings, currency } = parseBrokerCsv(csvText);
    if (holdings.length === 0) {
      throw new Error('No holdings found in CSV.');
    }

    setHoldings(holdings);
    setCurrency(currency);
    setSourceLabel(`${file.name} (local only)`);
    setError('');
  } catch (error) {
    setError(error instanceof Error ? error.message : 'CSV import failed.');
  } finally {
    setIsLoadingHoldings(false);
  }
}

async function signInWithPassword(
  email: string,
  password: string,
  setMessage: (message: string) => void,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setMessage(error ? error.message : 'Signed in.');
}

async function signUpWithPassword(
  email: string,
  password: string,
  setMessage: (message: string) => void,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage('Account created. Check your email for a confirmation link.');
}

async function saveBrand(
  symbol: string,
  userId: string | undefined,
  drafts: Record<string, { logoUrl: string; brandColor: string; textColor: string }>,
  setHoldings: (value: HoldingWithWeight[] | ((previous: HoldingWithWeight[]) => HoldingWithWeight[])) => void,
  setError: (message: string) => void,
): Promise<void> {
  const draft = drafts[symbol];
  if (!draft) {
    return;
  }

  if (!isHexColor(draft.brandColor) || !isHexColor(draft.textColor)) {
    setError(`Invalid color for ${symbol}. Use #RRGGBB.`);
    return;
  }

  if (userId) {
    try {
      await saveBrandOverride(userId, {
        symbol,
        logoUrl: draft.logoUrl,
        brandColor: draft.brandColor,
        textColor: draft.textColor,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : `Failed to save brand override for ${symbol}.`);
      return;
    }
  }

  setHoldings((previous) =>
    previous.map((holding) =>
      holding.symbol === symbol
        ? {
            ...holding,
            logoUrl: draft.logoUrl,
            brandColor: draft.brandColor,
            textColor: draft.textColor,
          }
        : holding,
    ),
  );

  setError('');
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function formatCurrency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildTreemapData(holdings: HoldingWithWeight[]): {
  tiles: HoldingWithWeight[];
  otherConstituents: HoldingWithWeight[];
  otherWeight: number;
} {
  if (holdings.length <= MAX_VISIBLE_TILES) {
    return { tiles: holdings, otherConstituents: [], otherWeight: 0 };
  }

  const primary = holdings.filter(
    (holding, index) => index < MAX_VISIBLE_TILES && holding.weight >= MIN_VISIBLE_WEIGHT,
  );
  const otherConstituents = holdings.filter(
    (holding, index) => !(index < MAX_VISIBLE_TILES && holding.weight >= MIN_VISIBLE_WEIGHT),
  );

  if (otherConstituents.length === 0) {
    return { tiles: holdings, otherConstituents: [], otherWeight: 0 };
  }

  const safePrimary = primary.length === 0 ? [holdings[0]] : primary;
  const normalizedOther = holdings.filter((holding) => !safePrimary.some((main) => main.symbol === holding.symbol));
  const otherWeight = normalizedOther.reduce((sum, item) => sum + item.weight, 0);
  const otherMarketValue = normalizedOther.reduce((sum, item) => sum + item.marketValueUsd, 0);

  const otherTile: HoldingWithWeight = {
    symbol: 'OTHER',
    name: `Other (${normalizedOther.length})`,
    logoUrl: '/logos/OTHER.svg',
    marketValueUsd: otherMarketValue,
    category: 'stock',
    brandColor: '#1f2937',
    textColor: '#f8fafc',
    weight: otherWeight,
  };

  return {
    tiles: [...safePrimary, otherTile].sort((a, b) => b.weight - a.weight),
    otherConstituents: normalizedOther,
    otherWeight,
  };
}

export default App;
