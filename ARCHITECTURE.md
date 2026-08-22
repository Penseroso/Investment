# Research Workspace Architecture

Document status: current architecture and explicitly labeled planned work, reviewed 2026-08-22.

## Current boundary

Global navigation composes the calendar, market-risk, and research workspaces, while feature components own presentation and hooks own remote or persistent state. `CompanyRepository` isolates the research client from the company API implementation.

The D1 schema starts from one pre-deployment baseline. Starter catalog data is a
separate, explicitly applied, generated seed; ordinary reads do not mutate the
database. `seed_versions` records the applied catalog version and checksum.

```text
AppNavigation
├── CalendarWorkspace → /api/calendar → calendar ingestion service → D1
├── RiskWorkspace → /api/risk → risk ingestion service → official adapters → D1
└── ResearchDesk
    ├── overview / valuation / filings / IR panels
    ├── useCompanies → CompanyRepository → /api/companies → D1
    ├── useSecFilings → /api/filings → SEC ingestion service → D1
    └── useIrDocuments → /api/ir → company IR adapter → D1
```

## Frontend ownership

- Responsive layout, tabs, dialogs and accessibility
- Selection and other ephemeral interaction state
- Loading, empty and error presentation
- Locale-aware number, date and currency formatting
- Rendering server-provided metric definitions and observations

The frontend must not calculate valuation metrics or infer source impact.

## Backend ownership

- Company registry: ticker, exchange, CIK, IR source and source rules
- Company research: business model, revenue/customer/cost structure, business lines, value drivers and risks
- Research source registry: official filing identity, URL, publication date and profile basis date
- Canonical metric definitions: label, definition, display formula, unit and version
- Company metric configuration: selected metrics, ordering and `whyItMatters`
- SEC and IR ingestion, normalization, deduplication and source health
- Company listings separate issuer identity from exchange-specific tickers
- The schema reserves source observations with observation dates, revision metadata and collection provenance; current risk adapters still calculate from fetched series in memory until raw-observation persistence is connected

Planned backend ownership, not yet implemented:

- Financial facts and valuation observations with period, currency and provenance
- Event extraction and automated analysis with evidence, prompt/model version and confidence

## SEC ingestion

`GET /api/filings?ticker=...` reads normalized documents from D1. An empty or older-than-six-hours collection triggers a read-through refresh from the SEC submissions API. `POST` on the same route performs an explicit refresh. Every attempt is recorded in `ingest_runs`; successful documents are upserted by SEC accession number in `filing_documents`.

The allowed form set is applied before display limits, with a 20-document quota per form and an 80-document total. This prevents ownership filings from pushing a company's 10-K or 20-F out of the stored feed. D1 document upserts run as one batch. If an automatic refresh fails and stored documents exist, the API keeps serving the last successful collection. A failed manual refresh remains explicit to the client.

The main submissions response is supplemented with up to four SEC-provided historical submission files. This covers issuers such as COHR and TSM whose current compact array has reached 1,000 filings. Stored filing provenance includes the source submission file, Act, file and film numbers, item list, byte size, and XBRL flags.

## IR ingestion

IR is independent from SEC filings at the API, storage and adapter layers. `GET /api/ir?ticker=...` serves stored `ir_documents` and performs a six-hour read-through refresh; `POST` forces a refresh. `ir_source_configs` stores each official listing URL, parser key, document limit and source health. Attempts share `ingest_runs` with `source_type = IR`.

- CEG parses official quarterly earnings releases and presentations.
- COHR parses official financial releases and investor events.
- TSM uses stable official quarterly-result and annual monthly-revenue URL rules because its IR and press domains reject non-browser fetches with a Cloudflare challenge. This avoids routing official-source collection through an unofficial proxy.

The client renders the flattened document DTO only. Parser behavior and source-health fields remain backend concerns.

## Market calendar ingestion

The root route is a global Korea-time calendar, independent from company research at `/research`. `GET /api/calendar` serves normalized rows from `calendar_events` and performs a seven-day read-through refresh. `POST` requests an explicit refresh. Concurrent same-range refreshes in one worker isolate share one promise, and a persisted 60-second Finnhub cooldown protects the free-plan request limit across worker isolates.

- BLS supplies CPI, PPI, Employment Situation, JOLTS, and Employment Cost Index dates. When its ICS endpoint rejects the deployment network, a verified 2026 official-calendar snapshot keeps these dates available until the live endpoint recovers. Live and fallback rows share a release-name-and-date identity so recovery updates rather than duplicates an event.
- BEA supplies GDP and Personal Income and Outlays release dates.
- Federal Reserve and Kansas City Fed dates are maintained as verified official schedules for FOMC decisions and Jackson Hole.
- Finnhub supplies watchlist-only earnings dates, market-session precision, EPS, and revenue observations. The API key is supplied through local environment variables during development and a Worker secret in hosted environments.

`calendar_ingest_runs` records each provider attempt. Calendar collection is currently request-driven: an empty or older-than-seven-days range triggers read-through collection, while `POST` forces collection. There is no calendar cron yet.

Planned: an event-driven scheduler will select a pending earnings row at its normalized pre-market or after-market time plus three hours, refresh that date, store EPS and revenue actuals, and apply bounded retries for missing results. Daily previous-close price collection is also future work for valuation calculations.

## Valuation calculation rule

`formulaDisplay` is explanatory content and may be stored with the canonical metric definition. Executable expressions are never accepted from a database. The backend maps a versioned `calculationKey` to tested application code and returns a calculation result with its source facts, period, currency, calculation version and timestamp.

The eventual API may flatten canonical definitions, company configuration and the latest observation into one presentation DTO. This keeps the client simple without losing normalized backend ownership.

Company research follows the same rule: normalized profile, business-line, research-point and source tables are flattened into the `Company.research` response for rendering. The client does not own or rewrite the research narrative.

## Market-risk monitoring

`GET /api/risk` serves the latest normalized snapshot for five signals and performs a twenty-hour read-through refresh. `POST` either forces collection or marks the current Korea-date report as read. Identical refreshes share one worker promise, and a failed signal receives a one-hour read-through cooldown. Source failures never overwrite a last successful snapshot.

- Credit: FRED/ICE BofA `BAMLH0A0HYM2`, daily HY option-adjusted spread
- Funding: New York Fed SOFR minus FRED IORB, expressed in basis points
- Liquidity: FRED `WRESBAL`, transformed to a four-week percent change; the underlying H.4.1 series is weekly
- Equity risk-off: Cboe VIX/VIX3M, read through FRED and divided on common observation dates
- Composite confirmation: the U.S. OFR FSI, daily with its publication lag retained in source metadata

Each adapter returns the same signal contract. The backend calculates one-, five-, and twenty-observation changes, a three-year z-score and stress-direction percentile, then applies explicit absolute and percentile thresholds. The OFR composite confirms independent signals but is not an equal fifth vote because its inputs overlap credit, funding, equity valuation, and volatility.

`risk_signal_snapshots` keeps normalized observations, `risk_ingest_runs` keeps provider health, and `risk_reports` persists the deterministic Korean daily summary and read timestamp. A daily Worker cron runs at 22:15 UTC (07:15 KST); the twenty-hour read-through refresh is its recovery path. The navigation dot is an in-app alert backed by the report read timestamp and revalidates on focus and every fifteen minutes. External push delivery remains separate infrastructure work.

MOVE is intentionally absent until a stable licensed endpoint is available. A future rates-volatility adapter can implement the same contract without changing the page component.

## Migration sequence

1. Completed: replace request-time SEC proxying with persistent read-through ingestion, explicit refresh and stored run history.
2. Completed: add persistent IR ingestion with company adapters, source health and explicit refresh.
3. Completed: add a global official macro, central-bank, and watchlist earnings calendar with weekly read-through collection.
4. Completed: add a five-signal market-risk ledger, daily read-through refresh, deterministic report, and in-app unread state.
5. Completed: attach the daily Worker scheduler; external push delivery remains future infrastructure work.
6. Add the earnings-time-plus-three-hours result job for timely beat, in-line, and miss updates.
7. Add versioned metric calculation and observations.
8. Add evidence-linked analysis after ingestion is reliable.
