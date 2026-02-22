# Invest Portfolio Visualizer

TypeScript + React app that visualizes portfolio concentration with branded logo tiles.

## Features

- Treemap sized by each holding's portfolio weight
- Brand-first tiles (logo + color + contrast text)
- Supabase login (email/password + Google OAuth)
- Per-user cloud portfolio storage in Postgres (RLS protected)
- CSV import for Avanza-style exports

## Local run

```bash
npm install
cp .env.example .env
# add your Supabase URL + anon key
npm run dev
```

If `.env` is missing, the app runs with demo data and no login.

## Supabase setup

1. Create a Supabase project.
2. In Supabase SQL editor, run: `supabase/schema.sql`.
3. In Supabase Auth providers, enable Email and optionally Google.
4. Add values to `.env`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## CSV import contract

Use the "Import broker CSV" button and select your exported file.

Required columns:

- `Namn`
- `Ticker`
- `Typ`
- `Marknad`
- `Valuta`
- `Värde`

The importer parses values, applies logo/brand-color defaults per symbol, computes weights, and saves to your Supabase portfolio when signed in.

## Database tables

- `portfolios`: user-owned portfolio container
- `holdings`: normalized current positions with market value and brand presentation fields

RLS policies ensure each user can access only their own rows.

## Branding notes

Brand defaults live in `src/lib/branding.ts`.

This is where you should maintain canonical logo URLs and tile colors per symbol for visual consistency.
