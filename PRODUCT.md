# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: OpenAI Sites with the Vinext React starter. The product is mobile-responsive and owner-focused.

## Users

The product is a single-owner workspace for an individual investor reviewing a focused watchlist and upcoming US market events on desktop and mobile; multi-user and team workflows are outside its boundary. The main job is to identify what changed in official information without repeatedly visiting multiple sources.

## Product Purpose

Investment Signal Desk gathers official US economic schedules, watchlist earnings dates, market-risk signals, SEC filings, and company investor-relations sources into one Korean-language research surface. Success means the user can see what is next or what changed and open the original source within seconds.

## Positioning

Unlike a broad market-data terminal, the product organizes evidence around a small personal watchlist and explains which valuation driver each event may affect. It does not issue buy or sell recommendations.

## Operating Context

The initial watchlist contains CEG, COHR, and TSM. Official filings and IR pages are separate source modules but can be joined into one event. News remains an on-demand future module.

## Capabilities and Constraints

- Persisted SEC filing collection for configured issuers, with six-hour read-through freshness and manual refresh
- Persisted official IR releases, presentations and results with company-specific adapters and source-health history
- Weekly persisted US macro, FOMC, Jackson Hole, and watchlist earnings calendar shown in Korea time
- Weekly timeline and monthly calendar views, with US pre-market and after-market labels
- Separate EPS and revenue beat, in-line, and miss labels when actual and consensus values are available
- Company-specific valuation indicators, monitoring rationale, definitions, and formulas
- Official-filing-based business model, business-line, value-driver, and structural-risk profiles
- Cross-device custom ticker additions backed by the site database
- No live price target, portfolio accounting, or buy and sell model
- Automated Korean summaries and valuation-impact labels for calendar and company research are deferred until source ingestion is stable
- Post-release earnings results are designed for an event-time-plus-three-hours job, separate from weekly schedule collection and future daily price collection
- Daily market-risk collection covers exactly five signals: FRED/ICE BofA HY OAS, New York Fed SOFR minus FRED IORB, FRED `WRESBAL` four-week change, VIX/VIX3M, and OFR FSI confirmation. MOVE is excluded until a stable licensed source is available.
- A daily Worker job runs at 22:15 UTC (07:15 KST); a twenty-hour read-through check recovers missed runs, and failed sources have a one-hour read-through cooldown.
- D1 retains normalized signal snapshots, collection runs, and deterministic Korean daily reports. Reports provide per-signal normal/watch/warning/stress labels and an in-app unread indicator; no buy or sell recommendation.
- The OFR FSI confirms the independent signals but is not an equal-weighted fifth vote because its inputs overlap them. External push delivery is deliberately deferred.

## Brand Commitments

The interface is Korean-first, restrained, information-dense, and mobile-first. A flat black market-workspace palette, continuous ledgers, and thin rules replace card-based decoration while accessibility, responsive behavior, and state clarity govern the finish.

## Evidence on Hand

Official SEC endpoints and official company IR URLs are the source of truth. The current interface contains no generated valuation conclusions.

## Product Principles

- Evidence before interpretation
- Events over duplicate documents
- Official source links remain one action away
- Familiar operation beats decorative novelty

## Accessibility & Inclusion

The MVP targets keyboard operation, visible focus, reduced-motion preferences, responsive layouts, and WCAG AA contrast.
