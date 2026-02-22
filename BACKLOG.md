# Backlog

Status legend:
- `[x]` Implemented
- `[ ]` Pending

## Phase 1: Core Visualization
- [x] Treemap-style portfolio view sized by holding weight
- [x] Logo tiles with symbol + weight labels
- [x] Holdings table + total portfolio value footer

## Phase 2: CSV Import
- [x] Import CSV from file picker in the frontend
- [x] Parse Avanza export columns: `Namn`, `Ticker`, `Typ`, `Marknad`, `Valuta`, `Värde`
- [x] Normalize values and compute weights from imported data

## Phase 3: Auth + Cloud Storage
- [x] Supabase client integration and environment config support
- [x] Auth gate for email/password sign-in + sign-up
- [x] Google OAuth button (provider must be enabled in Supabase)
- [x] Sign-out action
- [x] Supabase Postgres schema for `portfolios` and `holdings`
- [x] Row-level security (RLS) policies to isolate each user’s data
- [x] Load holdings from database for authenticated users
- [x] Save imported CSV holdings to database

## Phase 4: Branding
- [x] Symbol-based brand registry for logo URL + tile color + text color
- [x] Apply brand colors per tile with category fallback colors
- [x] In-app brand editor to override logo URL/colors without code changes
- [x] Persist brand overrides per user in database table (e.g. `instrument_overrides`)

## Phase 5: Product Hardening
- [ ] Snapshot history table + timeline chart (`snapshots`)
- [ ] Import audit log (who imported, when, source file name)
- [ ] Robust CSV validation UI with row-level error reporting
- [ ] Retry/fallback for failed logo URLs with cached local placeholder set
- [ ] Tests for parser, normalization, and DB data mapping
- [ ] Deployment pipeline + production environment setup
