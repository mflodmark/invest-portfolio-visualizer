import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getDemoPortfolio, getPortfolioFromDatabase, parseBrokerCsv, saveBrokerCsvToDatabase } from './lib/portfolio';
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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(hasSupabaseConfig);
  const [holdings, setHoldings] = useState<HoldingWithWeight[]>([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [sourceLabel, setSourceLabel] = useState<string>('Demo data');

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

  const layout = useMemo(
    () => buildSliceTreemap(holdings.map((item) => item.weight), { x: 0, y: 0, width: 100, height: 100 }),
    [holdings],
  );

  const total = useMemo(() => holdings.reduce((sum, item) => sum + item.marketValueUsd, 0), [holdings]);

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
                backgroundColor: holding.brandColor || CATEGORY_COLORS[holding.category],
                color: holding.textColor || '#f8fafc',
              }}
              title={`${holding.name} (${holding.symbol}) ${formatPercent(holding.weight)} | ${formatCurrency(holding.marketValueUsd, currency)}`}
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

export default App;
