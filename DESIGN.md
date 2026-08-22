# Design System

Document status: current interface and explicitly labeled exclusions, reviewed 2026-08-22.

## Product Character

Investment Signal Desk is a restrained personal research workspace, not a trading terminal. The interface prioritizes official evidence, compact reading, and fast source verification. Its visual language draws from modern market terminals and first-party research products without reproducing their layouts.

## Visual Language

- Near-black, mobile-first canvas with one continuous research surface
- Black navigation rail separated by a single neutral rule
- TradingView-style cobalt reserved for active states, links, and focus treatment
- Six-pixel radii for controls and twelve-pixel radii only for dialogs
- Thin rules and whitespace instead of content cards; the risk view remains a flat ledger at every breakpoint
- Pretendard Variable for the interface and Geist Mono for identifiers

## Hierarchy

The root desktop viewport keeps global navigation on the left and the current calendar period at the top. The risk route opens with one daily conclusion and then a continuous signal ledger. The research route keeps the watchlist on the left and company context at the top. Mobile uses a three-item bottom navigation, compact sticky route headers, and a ticker selector within the research route.

## Core Components

- Global navigation: calendar, market risk, and company research
- Calendar toolbar: period movement, current range, weekly or monthly view, and manual refresh
- Weekly timeline: seven Korea-time day rows with market events in time order
- Monthly calendar: compact 42-cell grid with a selected-day detail ledger
- Calendar event row: local time or US market session, event class, source, and optional earnings results
- Watchlist button: ticker and company name
- Company header: identity and market context
- Company research: business model, business lines, value drivers, risks, and official basis source in a continuous document flow
- Tab strip: overview, valuation, filings, and IR
- Valuation row: metric name and the company-specific reason for monitoring it
- Metric dialog: definition, calculation, and interpretation in a plain text hierarchy
- Filing row: form, filing date, description, and official SEC link
- IR registry: official company link and persisted document feed for supported company adapters
- Add-ticker panel: D1-backed registration with optional CIK and IR URL; custom-company SEC and IR onboarding remains limited until a supported source configuration exists
- Risk report header: one dated state, conclusion, summary, and manual refresh
- Risk ledger: five flat rows for value, change, historical stress percentile, status, trend, observation date, and official source

## States

Every remote-source surface has loading, success, empty, and recoverable error states. A failed SEC request preserves the official-source context and exposes a retry action. Custom tickers explicitly show that source verification is still required. The market-risk navigation item shows an in-app unread badge for a new daily report; it revalidates when the app gains focus and every fifteen minutes. External push is not part of this interface.

## Interaction and Accessibility

- Controls have visible hover and keyboard focus states.
- Tabs use tab semantics and expose the selected state.
- Metric explanations open as keyboard-accessible dialogs and mobile bottom sheets.
- Motion is limited to short state transitions and a loading rotation, with reduced-motion support.
- Targets remain usable on touch screens and content does not rely on color alone.

## Responsive Rules

- Above 980 pixels: the calendar uses a fixed global-navigation rail, while research uses a fixed watchlist rail; both keep a continuous content pane.
- At 980 pixels and below: all routes use the three-item bottom navigation; calendar and risk gain compact sticky headers, while research keeps its sticky app bar with ticker picker and full-width workspace.
- At 680 pixels and below: the calendar timeline becomes one column, month cells reduce to event counts, risk rows become three compact information bands, research keeps fixed four-tab navigation, and dialogs become bottom sheets.

## Deliberate Exclusions

Live price charts, buy or sell recommendations, portfolio accounting, decorative market widgets, and automated news judgment are outside this MVP. News can be added later as a separate request-driven module after official-source ingestion is stable.
