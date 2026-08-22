# Investment Signal Desk

A private investment-research workspace running on Cloudflare Workers through
[vinext](https://github.com/cloudflare/vinext), with Cloudflare D1 and Drizzle.

## Prerequisites

- Node.js `>=22.13.0`
- A Cloudflare account with Workers, D1, and Zero Trust Access enabled

## Cloudflare lifecycle

Use `npm ci` for a locked install, `npm run dev` for local development,
`npm run build` for the deployable Worker artifact, and `npm run deploy` only
after the remote D1 migration and Cloudflare Access policy are ready.

`wrangler.jsonc` is the source of truth for the Worker configuration and the
`DB` binding used by Wrangler commands. Production and preview URLs are disabled
by default so the first deployment cannot become public before Access is attached.

Before enabling a custom domain or `workers.dev`, protect the complete Worker in
Cloudflare Dashboard under **Workers & Pages → investment-signal-desk → Access**
and restrict the policy to the intended account or email address.

## Included Shape

- edit application code under `app/`
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` defines the persisted calendar, research, and market-risk records
- `worker/index.ts` runs the daily market-risk collection at 22:15 UTC (07:15 KST)
- `wrangler.jsonc` configures the Worker cron and D1 binding
- `drizzle.config.ts` supports local migration generation when needed

## Market-risk monitoring

The `/risk` workspace stores its state in D1: normalized signal snapshots, ingestion runs, and deterministic Korean daily reports. It monitors five signals only: FRED/ICE BofA HY OAS, New York Fed SOFR minus FRED IORB, FRED `WRESBAL` four-week change, Cboe VIX/VIX3M through FRED, and OFR FSI confirmation. MOVE is intentionally excluded until a stable licensed endpoint is available.

The Worker collects daily; a twenty-hour read-through refresh recovers missed collection and each failed source is subject to a one-hour read-through cooldown. OFR FSI is a confirmation signal, not an equal-weighted fifth vote, because of overlap with the four independent signals. The application exposes unread reports with an in-app badge that revalidates on focus and every fifteen minutes. External push delivery is deferred.

## Authentication boundary

The OpenAI Sites identity headers and `app/chatgpt-auth.ts` are legacy export
artifacts. They are not an authentication boundary when this repository is
deployed directly to Cloudflare. Keep the Worker unreachable until a Cloudflare
Access policy protects the entire Worker or an equivalent application-level
authentication layer has been implemented.

## Diagnostic Commands

- `npm run install:ci`: install the exact lockfile dependency set
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Worker artifact
- `npm run preview`: preview the built Worker locally
- `npm run deploy`: build and deploy through Wrangler
- `npm run typecheck`: run strict TypeScript validation
- `npm run worker:types`: regenerate Cloudflare binding and runtime types
- `npm test`: type-check, build, and run rendered and unit tests
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npx wrangler d1 migrations apply investment-signal-desk-db --local`: apply migrations to the local D1 database
- `npx wrangler d1 migrations apply investment-signal-desk-db --remote`: apply migrations to the bound remote D1 database

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
