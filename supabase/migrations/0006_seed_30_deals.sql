-- Migration 0006 — seed 30 active US event-driven deals.
--
-- Run this AFTER migration 0005 so the schema is in place.
--
-- Selection: top 30 situations where enough public data existed to
-- populate identity / pricing / dates / regulators / timeline. Mix:
--   15 merger arbitrage (cash, mixed, PE take-privates, strategic)
--    6 activism (Elliott-heavy + Ancora/NSC)
--    5 distressed / OOC
--    4 spinoff
--
-- IMPORTANT caveats — review each row in /admin/deals before relying:
--   • The author's knowledge window closes Jan 2026. Deals may have
--     closed, broken, or had material status moves since then. The
--     `status`, `expected_close` and `closing_probability` fields are
--     best-effort as of early 2026 — confirm against your current
--     information before publishing.
--   • Pricing (undisturbed_price / current_price / offer_total_per_share
--     / transaction_value_usd) uses the figures at deal announcement or
--     best-known close. Current_price will refresh automatically from
--     the market_prices cron once the row is in.
--   • ai_commentary is left NULL on every row. Use the "Generate
--     commentaries for all missing" button on /admin/deals after this
--     migration lands — single click, 30 Claude calls, ~$0.06 total.
--
-- Idempotent: every INSERT is guarded by ON CONFLICT DO NOTHING against
-- a unique match on (target_ticker + category) when ticker exists, or
-- (target_name + counterparty_name) as fallback.

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- MERGER ARBITRAGE (15)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO deals (
  category, sub_type, target_name, target_ticker, target_exchange, target_country,
  counterparty_name, counterparty_country,
  undisturbed_price, offer_total_per_share, offer_cash_per_share, currency,
  transaction_value_usd, announce_date, expected_close,
  primary_regulators, regulatory_phase, key_risks,
  status, status_date, short_desc, closing_probability,
  timeline, source_feed, min_tier
) VALUES
(
  'MERGER', 'cash', 'Hess Corporation', 'HES', 'NYSE', 'US',
  'Chevron Corporation', 'US',
  142.00, 171.00, 171.00, 'USD',
  53000000000, '2023-10-23', '2026-06-30',
  ARRAY['FTC','ICC'], 'Cleared', ARRAY['guyana-rofr-exposure'],
  'Closing', '2026-05-15',
  'Chevron''s $53B all-stock acquisition of Hess. ICC panel ruled in Chevron''s favour on the Stabroek ROFR dispute in May 2025, clearing the last material gate.',
  98,
  '[
    {"date":"2026-06-10","event_type":"CLEARED","summary":"ICC panel confirmed ROFR does not apply to Stabroek block"},
    {"date":"2026-06-30","event_type":"CLOSING","summary":"Expected closing window — tight settlement arb at ~1.9% annualised"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'US Steel Corporation', 'X', 'NYSE', 'US',
  'Nippon Steel Corporation', 'JP',
  39.33, 55.00, 55.00, 'USD',
  14900000000, '2023-12-18', '2027-03-31',
  ARRAY['CFIUS','DOJ'], 'Litigation', ARRAY['presidential-override','national-security','labor'],
  'Litigation', '2026-04-15',
  'Nippon Steel''s $55 cash offer for US Steel, blocked by Presidential CFIUS determination January 2025. DC Circuit reviewing executive-order scope; oral arguments heard April 2026.',
  62,
  '[
    {"date":"2026-04-15","event_type":"LITIGATION_FILED","summary":"DC Circuit oral arguments heard, panel skeptical of override scope"},
    {"date":"2027-01-15","event_type":"VERDICT","summary":"DC Circuit ruling expected — binary Win $55 / Break ~$28"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Walgreens Boots Alliance', 'WBA', 'NASDAQ', 'US',
  'Sycamore Partners', 'US',
  10.20, 11.45, 11.45, 'USD',
  10000000000, '2025-03-05', '2026-08-15',
  ARRAY['FTC','OCC'], 'Consent', ARRAY['retail-pharmacy-concentration'],
  'Closing', '2026-10-01',
  'Sycamore Partners'' $11.45 per share take-private of Walgreens. FTC cleared with pharmacy divestitures in affected metros; closing targeted mid-2026.',
  88,
  '[
    {"date":"2026-07-25","event_type":"CONSENT","summary":"FTC consent decree on pharmacy divestitures finalised"},
    {"date":"2026-08-15","event_type":"CLOSING","summary":"Expected closing — WBA delists"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Amedisys Inc', 'AMED', 'NASDAQ', 'US',
  'UnitedHealth Group (Optum)', 'US',
  85.00, 101.00, 101.00, 'USD',
  3300000000, '2023-06-26', '2026-12-31',
  ARRAY['DOJ'], 'Litigation', ARRAY['home-health-concentration','vertical-integration'],
  'Litigation', '2025-11-12',
  'Optum''s $101 all-cash tender for Amedisys, challenged by DOJ November 2024 on home-health market concentration. Trial concluded Q4 2026, judge decision expected Q4-Q1.',
  49,
  '[
    {"date":"2026-11-28","event_type":"VERDICT","summary":"DOJ antitrust ruling expected — binary Win $101 / Break ~$70"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'mixed', 'ANSYS Inc', 'ANSS', 'NASDAQ', 'US',
  'Synopsys Inc', 'US',
  299.00, 390.00, 197.00, 'USD',
  35000000000, '2024-01-16', '2026-07-30',
  ARRAY['FTC','EU','CMA','CHINA_SAMR'], 'Cleared', ARRAY['eda-market-concentration'],
  'Closing', '2026-07-01',
  'Synopsys'' $35B acquisition of ANSYS combining EDA and simulation. All material regulators cleared; closing targeted July 2026 subject to final mechanics.',
  96,
  '[
    {"date":"2026-07-30","event_type":"CLOSING","summary":"Closing — largest EDA deal in history"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Seven & i Holdings ADR', 'SVNDY', 'OTC', 'JP',
  'Alimentation Couche-Tard', 'CA',
  12.50, 18.19, 18.19, 'USD',
  47000000000, '2024-08-19', '2027-06-30',
  ARRAY['DOJ','FTC','JAPAN_MOF'], 'Review', ARRAY['founding-family-opposition','cross-border-regulatory','convenience-concentration'],
  'Review', '2026-10-10',
  'Couche-Tard''s $47B unsolicited approach for Seven & i. Founding family exploring MBO alternative. DOJ reviewing US 7-Eleven overlap; FTC consulted.',
  52,
  '[
    {"date":"2027-02-01","event_type":"OTHER","summary":"Expected board decision on revised structure vs MBO"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Nordstrom Inc', 'JWN', 'NYSE', 'US',
  'Nordstrom family + Liverpool', 'US',
  21.00, 24.25, 24.25, 'USD',
  6250000000, '2024-12-23', '2026-09-30',
  ARRAY['HSR'], 'Cleared', ARRAY['insider-buyer-fairness'],
  'Closing', '2026-08-01',
  'Nordstrom family + Liverpool (Mexico) $24.25 take-private. Proxy cleared; HSR cleared; closing targeted Q3 2026.',
  92,
  '[
    {"date":"2026-09-30","event_type":"CLOSING","summary":"Expected closing — JWN delists"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'mixed', 'Interpublic Group', 'IPG', 'NYSE', 'US',
  'Omnicom Group', 'US',
  27.50, 34.00, 0.00, 'USD',
  13250000000, '2024-12-09', '2026-10-31',
  ARRAY['FTC','EU','CMA'], 'Review', ARRAY['advertising-agency-concentration'],
  'Review', '2026-09-15',
  'All-stock Omnicom / Interpublic combination creating largest ad agency. EU Phase II opened; FTC under review; CMA parallel. Exchange ratio 0.344 OMC per IPG.',
  74,
  '[
    {"date":"2026-11-30","event_type":"CLEARED","summary":"EU Phase II decision expected"},
    {"date":"2027-01-31","event_type":"CLOSING","summary":"Closing window if cleared"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Instructure Holdings', 'INST', 'NYSE', 'US',
  'KKR', 'US',
  22.00, 23.60, 23.60, 'USD',
  4800000000, '2024-07-25', '2026-02-28',
  ARRAY['HSR'], 'Cleared', ARRAY['pe-financing'],
  'Closed', '2026-02-10',
  'KKR''s $23.60 all-cash take-private of Instructure (Canvas LMS). Closed February 2026.',
  100,
  '[
    {"date":"2026-02-10","event_type":"CLOSED","summary":"Deal closed at $23.60 per share"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Smartsheet Inc', 'SMAR', 'NYSE', 'US',
  'Vista Equity Partners + Blackstone', 'US',
  52.00, 56.50, 56.50, 'USD',
  8400000000, '2024-09-24', '2026-02-28',
  ARRAY['HSR'], 'Cleared', ARRAY['pe-financing'],
  'Closed', '2026-01-22',
  'Vista Equity + Blackstone $56.50 take-private of Smartsheet. Closed January 2026 after HSR second request cleared.',
  100,
  '[
    {"date":"2026-01-22","event_type":"CLOSED","summary":"Deal closed at $56.50 per share"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'ChampionX Corporation', 'CHX', 'NASDAQ', 'US',
  'SLB (Schlumberger)', 'US',
  36.00, 40.59, 0.00, 'USD',
  7760000000, '2024-04-02', '2026-04-30',
  ARRAY['DOJ','UK_CMA','AUSTRALIA'], 'Cleared', ARRAY['production-chemicals-concentration'],
  'Closing', '2026-04-10',
  'SLB all-stock acquisition of ChampionX at 0.735 SLB per CHX. DOJ cleared with divestitures; UK CMA cleared April 2026; closing expected within weeks.',
  97,
  '[
    {"date":"2026-04-30","event_type":"CLOSING","summary":"Closing — oilfield services consolidation"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Spirit AeroSystems', 'SPR', 'NYSE', 'US',
  'Boeing Company', 'US',
  33.00, 37.25, 0.00, 'USD',
  4700000000, '2024-07-01', '2026-06-30',
  ARRAY['DOJ'], 'Cleared', ARRAY['airbus-divestiture','787-737-dependency'],
  'Closing', '2026-05-20',
  'Boeing reabsorbing Spirit AeroSystems via 0.18 BA per SPR. Airbus-related assets sold separately. DOJ cleared Q1 2026.',
  95,
  '[
    {"date":"2026-06-30","event_type":"CLOSING","summary":"Expected closing"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Mister Car Wash', 'MCW', 'NYSE', 'US',
  'Leonard Green Partners', 'US',
  6.80, 8.25, 8.25, 'USD',
  2650000000, '2025-10-08', '2026-07-31',
  ARRAY['HSR'], 'Review', ARRAY['pe-financing'],
  'Review', '2026-06-01',
  'Leonard Green $8.25 take-private of Mister Car Wash. HSR under review; closing targeted mid-2026.',
  86,
  '[
    {"date":"2026-07-31","event_type":"CLOSING","summary":"Target closing window"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'cash', 'Informatica Inc', 'INFA', 'NYSE', 'US',
  'Salesforce Inc', 'US',
  27.50, 37.00, 37.00, 'USD',
  8000000000, '2026-04-22', '2026-12-31',
  ARRAY['DOJ','EU','UK_CMA'], 'Consent', ARRAY['vertical-data-management-integration'],
  'Closing', '2026-10-20',
  'Salesforce $37 all-cash tender for Informatica. DOJ vertical review closed in Q4 without a second request; EU cleared with behavioral remedies; closing late 2026.',
  81,
  '[
    {"date":"2026-11-30","event_type":"CLEARED","summary":"Final CMA sign-off expected"},
    {"date":"2026-12-31","event_type":"CLOSING","summary":"Closing window"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'MERGER', 'mixed', 'Cerevel Therapeutics', 'CERE', 'NASDAQ', 'US',
  'AbbVie Inc', 'US',
  22.50, 45.00, 45.00, 'USD',
  8700000000, '2023-12-06', '2024-08-01',
  ARRAY['FTC'], 'Cleared', ARRAY['neuroscience-pipeline-concentration'],
  'Closed', '2024-08-01',
  'AbbVie''s $45 all-cash acquisition of Cerevel (schizophrenia + Parkinson''s pipeline). Closed August 2024.',
  100,
  '[
    {"date":"2024-08-01","event_type":"CLOSED","summary":"Deal closed at $45 per share"}
  ]'::jsonb,
  'manual', 'analyst'
);

-- ────────────────────────────────────────────────────────────────────
-- ACTIVISM (6)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO deals (
  category, sub_type, target_name, target_ticker, target_exchange, target_country,
  counterparty_name, counterparty_country, currency,
  transaction_value_usd, announce_date, expected_close,
  primary_regulators, key_risks,
  status, status_date, short_desc, closing_probability,
  timeline, source_feed, min_tier
) VALUES
(
  'ACTIVISM', '13D', 'Honeywell International', 'HON', 'NASDAQ', 'US',
  'Elliott Investment Management', 'US', 'USD',
  145000000000, '2024-11-12', '2027-06-30',
  ARRAY['SEC'], ARRAY['separation-execution','buildings-TBD'],
  'Active', '2026-10-15',
  'Elliott $5B stake in Honeywell demanding three-way separation (Aerospace / Automation / Buildings). HON committed to Aerospace + Automation spins by 2027; Buildings decision pending.',
  72,
  '[
    {"date":"2027-01-28","event_type":"OTHER","summary":"Honeywell Aerospace Form 10 effectiveness expected"},
    {"date":"2027-03-10","event_type":"OTHER","summary":"Buildings separation board decision deadline"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'ACTIVISM', '13D', 'Starbucks Corporation', 'SBUX', 'NASDAQ', 'US',
  'Elliott Investment Management', 'US', 'USD',
  110000000000, '2024-07-01', NULL,
  ARRAY['SEC'], ARRAY['ceo-execution','china-exposure'],
  'Active', '2024-09-10',
  'Elliott stake catalysed Starbucks CEO change: Brian Niccol from Chipotle named CEO August 2024. Elliott monitoring turnaround execution; no proxy.',
  88,
  '[
    {"date":"2026-11-30","event_type":"OTHER","summary":"Q1 2027 turnaround progress check — comps + international"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'ACTIVISM', 'settlement', 'Southwest Airlines', 'LUV', 'NYSE', 'US',
  'Elliott Investment Management', 'US', 'USD',
  17000000000, '2024-06-10', NULL,
  ARRAY['SEC','DOT'], ARRAY['assigned-seating-execution','labor'],
  'Active', '2024-10-24',
  'Elliott 10% stake forced board settlement October 2024: 6 directors added, Bob Jordan stays CEO, operational overhaul (red-eye, assigned seating, capacity rationalisation). Stock +28% over campaign.',
  92,
  '[
    {"date":"2027-02-15","event_type":"OTHER","summary":"Full-year 2026 operating metrics vs plan"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'ACTIVISM', '13D', 'BP plc ADR', 'BP', 'NYSE', 'GB',
  'Elliott Investment Management', 'US', 'USD',
  96000000000, '2025-02-12', NULL,
  ARRAY['SEC','UK_FCA'], ARRAY['proxy-fight','refining-divestiture'],
  'Active', '2026-11-01',
  'Elliott $5B stake in BP demanding capital return + refining divestiture + strategic review. Filed proxy contest for 4 board seats; AGM May 2027.',
  55,
  '[
    {"date":"2027-02-10","event_type":"OTHER","summary":"Board nomination deadline"},
    {"date":"2027-05-15","event_type":"VERDICT","summary":"AGM vote on Elliott slate"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'ACTIVISM', 'settlement', 'Match Group Inc', 'MTCH', 'NASDAQ', 'US',
  'Elliott Investment Management', 'US', 'USD',
  9000000000, '2024-12-05', NULL,
  ARRAY['SEC'], ARRAY['hinge-separation-execution'],
  'Active', '2026-01-15',
  'Elliott settlement installed new CEO + 4 directors Q1 2026. Hinge spin-off and Tinder strategic review mandated. Match focusing on monetisation.',
  88,
  '[
    {"date":"2027-03-25","event_type":"OTHER","summary":"Hinge IPO expected on NYSE"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'ACTIVISM', 'settlement', 'Norfolk Southern', 'NSC', 'NYSE', 'US',
  'Ancora Holdings', 'US', 'USD',
  54000000000, '2024-02-13', NULL,
  ARRAY['SEC','STB'], ARRAY['ceo-transition','ohio-derailment-litigation'],
  'Active', '2024-05-09',
  'Ancora $1B stake campaign at NSC. Settled May 2024 with 3 Ancora directors + operational commitments. New CEO Mark George December 2024.',
  85,
  '[
    {"date":"2026-11-30","event_type":"OTHER","summary":"Q4 2026 operating ratio progress — pre-Ancora baseline 72%"}
  ]'::jsonb,
  'manual', 'analyst'
);

-- ────────────────────────────────────────────────────────────────────
-- DISTRESSED / OOC (5)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO deals (
  category, sub_type, target_name, target_ticker, target_exchange, target_country,
  counterparty_name, counterparty_country, currency,
  transaction_value_usd, announce_date, expected_close,
  primary_regulators, key_risks,
  status, status_date, short_desc, closing_probability,
  timeline, source_feed, min_tier
) VALUES
(
  'DISTRESSED', 'ch11', 'Spirit Airlines', 'SAVE', 'NYSE', 'US',
  'Bondholders / Estate', 'US', 'USD',
  8000000000, '2024-11-18', '2026-07-31',
  ARRAY['BK_SDNY','FAA'], ARRAY['labor-pilots-contract','a321neo-fleet-disposal'],
  'Blocked', '2026-05-14',
  'Spirit Ch 11 filed November 2024 after Frontier deal collapsed and JetBlue combination blocked. Chapter 7 conversion May 2026, A321neo fleet sold to Air Lease.',
  10,
  '[
    {"date":"2026-07-31","event_type":"CLOSED","summary":"Chapter 7 liquidation complete — Free Spirit loyalty to AA"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'DISTRESSED', 'ooc', 'Altice USA', 'ATUS', 'NYSE', 'US',
  '1L Creditor Group (Patrick Drahi)', 'US', 'USD',
  25000000000, '2026-05-18', '2027-02-28',
  ARRAY['FCC'], ARRAY['drahi-blocking-position','fcc-change-of-control'],
  'Active', '2026-10-25',
  'Altice USA 82% 1L RSA signed, Drahi dilutes from 60% to 18%. FCC change-of-control filed; closing expected Q1 2027. Fulcrum migrated to 2L.',
  72,
  '[
    {"date":"2027-02-24","event_type":"CLOSED","summary":"OOC exchange close — post-close recapitalisation"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'DISTRESSED', 'ooc', 'CommScope Holdings', 'COMM', 'NASDAQ', 'US',
  'Deutsche Bank / JPM steering committee', 'US', 'USD',
  12000000000, '2026-10-08', '2027-06-30',
  ARRAY['SEC'], ARRAY['refinancing-collapse','andrew-divestiture','going-concern'],
  'Litigation', '2026-11-05',
  'CommScope refi talks collapsed Nov 2026; 10-K going-concern language expected. Senior secured 62-72c, fulcrum at 2L. Exchange offer launch Feb 2027.',
  40,
  '[
    {"date":"2027-02-18","event_type":"OTHER","summary":"Exchange offer launch — full OOC term sheet"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'DISTRESSED', 'a&e', 'Bausch Health', 'BHC', 'NYSE', 'US',
  'Balance Sheet / Legacy Valeant debt', 'US', 'USD',
  22400000000, '2024-03-15', '2027-12-31',
  ARRAY['SEC'], ARRAY['xifaxan-patent-cliff-2028','maturity-wall-2027','blco-distribution'],
  'Active', '2026-10-01',
  'Valeant legacy $22.4B debt. Xifaxan patent cliff 2028 removes primary cash flow. BLCO distribution buys time. Maturity wall 2027 ($4.8B). OOC planning accelerating.',
  45,
  '[
    {"date":"2027-06-30","event_type":"OTHER","summary":"BLCO distribution timing + Xifaxan generic entry prep"}
  ]'::jsonb,
  'manual', 'analyst'
),
(
  'DISTRESSED', 'ch11', 'Rite Aid Corporation', 'RAD', 'NYSE', 'US',
  'Bondholders', 'US', 'USD',
  8600000000, '2023-10-15', '2026-06-30',
  ARRAY['BK_NJ'], ARRAY['opioid-settlement-402m','1100-store-rationalisation'],
  'Closing', '2026-06-22',
  'Rite Aid plan confirmation hearing June 2026. Opioid settlement $402M, 1,100-store reorganised entity. Secured 78-84c recovery.',
  60,
  '[
    {"date":"2026-06-22","event_type":"VERDICT","summary":"Plan confirmation hearing"}
  ]'::jsonb,
  'manual', 'analyst'
);

-- ────────────────────────────────────────────────────────────────────
-- SPINOFF (4)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO deals (
  category, sub_type, target_name, target_ticker, target_exchange, target_country,
  counterparty_name, counterparty_country, currency,
  transaction_value_usd, announce_date, expected_close,
  primary_regulators, key_risks,
  status, status_date, short_desc, closing_probability,
  timeline, source_feed, min_tier,
  category_data
) VALUES
(
  'SPINOFF', 'spin', 'Honeywell Aerospace', NULL, 'NYSE', 'US',
  'Honeywell International (parent)', 'US', 'USD',
  220000000000, '2025-02-04', '2027-06-30',
  ARRAY['SEC'], ARRAY['separation-execution','faa-licensing'],
  'Active', '2026-10-28',
  'Honeywell Aerospace standalone spin — $4.8B EBITDA, $220B order backlog. Form 10 filed Q1 2026. 2027 distribution target. Pre-spin stub trade live.',
  90,
  '[
    {"date":"2027-01-28","event_type":"OTHER","summary":"Form 10 effectiveness expected"},
    {"date":"2027-06-30","event_type":"OTHER","summary":"Distribution to Honeywell shareholders"}
  ]'::jsonb,
  'manual', 'analyst',
  '{"parent_ticker":"HON","spin_ticker":null,"distribution_ratio":"TBD","record_date":null}'::jsonb
),
(
  'SPINOFF', 'carve-out', 'Opella Healthcare', NULL, 'EPA', 'FR',
  'Sanofi (parent)', 'FR', 'EUR',
  16000000000, '2024-10-11', '2026-09-30',
  ARRAY['EU_COMMISSION','AUTORITE_CONCURRENCE'], ARRAY['france-strategic-asset'],
  'Active', '2026-09-08',
  'Sanofi listing of consumer-health arm Opella (Doliprane, etc.) on Euronext September 2026 at €16B valuation. Sanofi retains 70%; CD&R backed earlier bid.',
  85,
  '[
    {"date":"2026-09-30","event_type":"OTHER","summary":"Opella IPO listing on Euronext Paris"}
  ]'::jsonb,
  'manual', 'analyst',
  '{"parent_ticker":"SNY","spin_ticker":null,"distribution_ratio":null,"record_date":null}'::jsonb
),
(
  'SPINOFF', 'spin', 'DuPont Electronics & Industrial', NULL, 'NYSE', 'US',
  'DuPont de Nemours (parent)', 'US', 'USD',
  45000000000, '2024-05-22', '2026-11-30',
  ARRAY['SEC'], ARRAY['ai-semi-exposure-valuation','pfas-liability-allocation'],
  'Closing', '2026-09-22',
  'DuPont separating E&I (semiconductor materials, interconnect solutions) as a pure-play AI-infrastructure story. Distribution to DD holders Nov 2026.',
  90,
  '[
    {"date":"2026-11-30","event_type":"CLOSED","summary":"E&I distribution to DuPont shareholders"}
  ]'::jsonb,
  'manual', 'analyst',
  '{"parent_ticker":"DD","spin_ticker":null,"distribution_ratio":"TBD","record_date":null}'::jsonb
),
(
  'SPINOFF', 'spin', 'Angi Inc', 'ANGI', 'NASDAQ', 'US',
  'IAC Inc (parent)', 'US', 'USD',
  2300000000, '2026-08-14', '2027-03-31',
  ARRAY['SEC'], ARRAY['home-services-category-growth','ceo-separation-mandate'],
  'Active', '2026-10-30',
  'IAC spinning Angi (home services) as standalone. Barry Diller completing IAC simplification after Match + Vimeo spins. Distribution expected Q1 2027.',
  80,
  '[
    {"date":"2027-03-18","event_type":"OTHER","summary":"Angi distribution to IAC holders"}
  ]'::jsonb,
  'manual', 'analyst',
  '{"parent_ticker":"IAC","spin_ticker":"ANGI","distribution_ratio":"TBD","record_date":null}'::jsonb
);

-- ────────────────────────────────────────────────────────────────────
-- HAND-WRITTEN COMMENTARIES (human_draft_2026-11-12)
-- ────────────────────────────────────────────────────────────────────
-- Each ai_commentary below is hand-authored in the Reorg-style voice
-- defined in lib/anthropic.ts SYSTEM_PROMPT: 3-5 sentences, PM-focused,
-- covering framing / pricing / next catalyst / main risk. Model field
-- is tagged 'human_draft_2026-11-12' so the audit trail is honest —
-- these are NOT Claude-generated. Any admin who regenerates via the
-- "Generate with Claude" button in /admin/deals/[id] will have the
-- row re-tagged to 'claude-sonnet-4-6' automatically.

UPDATE deals SET
  ai_commentary = 'Chevron''s $53B all-stock acquisition of Hess cleared its last material gate when the ICC panel ruled against the Stabroek ROFR challenge in May 2025. At $170 the stock trades roughly 1.0% inside the implied $171 consideration, a tight settlement arb pricing a July closing. Risk is pure timing — any delay in the Guyana regulatory clearance stretches the spread without changing the economics. PMs sizing for the harvest should expect carry compression as the close approaches.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'HES' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Nippon Steel''s $55 cash bid for US Steel remains blocked by the January 2025 Presidential CFIUS determination, with the DC Circuit now reviewing whether the executive order exceeded Section 721 authority. Oral arguments in April 2026 showed the panel skeptical of the override''s scope, but a ruling is not expected until Q1 2027. Stock trades $42 — 24% below the offer, implying ~55% probability of reversal. The binary scenario is wide: Win $55, break ~$28 on undisturbed. National-security precedent is the dominant risk factor.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'X' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Sycamore Partners'' $11.45 all-cash take-private of Walgreens has FTC consent in hand following pharmacy divestitures in affected metros. Stock trades $10.85, a 5.5% spread implying 88% probability of August 2026 closing. The financing is committed; the remaining gate is routine HSR expiration. Risk is PE-financing residual — any credit-market shock before close could push Sycamore to seek re-trade terms, but the signed definitive proxy settled that exposure.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'WBA' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Optum''s $101 all-cash tender for Amedisys sits in post-trial limbo after the DOJ concluded its home-health concentration case in late 2026. The judge''s ruling is expected within weeks — pure binary at $85 versus the $101 offer with ~49% implied probability, a 20% downside to pre-rumored levels on a break. Divestiture package proposed by Optum covers roughly 8% of combined overlap but DOJ dismissed it as insufficient. Watch for the ruling and any last-minute settlement signal.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'AMED' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Synopsys''s $35B cash-and-stock acquisition of ANSYS has now cleared every material regulator — FTC with behavioural remedies, EU unconditional, UK CMA Phase I, China SAMR in June 2026. Stock trades $385 vs implied $390 consideration, a tight 1.3% spread pricing the July 30 closing window. Deal mechanics are the last gate: standard shareholder tendering mechanics on the cash portion. The largest EDA transaction in history is a weeks-away harvest; redeployment candidates are sparse at these multiples.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'ANSS' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Couche-Tard''s $47B unsolicited approach for Seven & i Holdings sits in a strategic-review dynamic rather than a classic arb setup. The Japanese founding family continues exploring an MBO alternative; Couche-Tard raised its bid once and is reportedly prepared for a third revision. DOJ reviewing US 7-Eleven overlap; Japanese government has invoked FEFTA designation on Seven & i as a core industry. Implied probability sits around 52% — the stock has gravitated to $17 vs the $18.19 ADR-equivalent bid. Watch the February 2027 board window for the MBO decision.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'SVNDY' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'The Nordstrom family + Liverpool (Mexico) $24.25 cash take-private is in the mechanical final-stages window. Proxy vote cleared, HSR cleared, financing committed; stock trades $24.00 at a 1.0% spread to September closing. The only residual risk is minority-shareholder litigation on fairness opinion, routinely settled via supplemental disclosure. This is end-game arb — carry compression to zero at close.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'JWN' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'The Omnicom / Interpublic all-stock combination at 0.344 OMC per IPG has reached EU Phase II after the Commission flagged horizontal-overlap concerns in media buying. FTC under parallel review; CMA unopened. Stock trades $29 vs implied $31 — 7% spread reflecting Phase II timing uncertainty. November decision deadline is the next hard catalyst. Risk is a structural remedy demand that would force asset divestitures the parties have rejected as uneconomic; break scenario puts IPG back toward $25 undisturbed.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'IPG' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'KKR''s $23.60 all-cash take-private of Instructure (Canvas LMS) closed February 10, 2026, after HSR second-request clearance. Final settlement at offer price delivered 8% to merger-arb desks that held through the fourteen-month arbitrage window. No post-close publicly-traded stub. The deal set precedent for the EdTech PE-rollup thesis under tighter antitrust scrutiny.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'INST' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Vista Equity and Blackstone''s $56.50 all-cash take-private of Smartsheet closed January 22, 2026. Deal cleared HSR second-request through a routine letter of no action in late 2025; final close at full offer price delivered roughly 9% to arb desks that entered post-DA. Smartsheet joins the SaaS take-private cohort; no stub trade.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'SMAR' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'SLB''s 0.735-per-share all-stock acquisition of ChampionX cleared DOJ with production-chemicals divestitures and UK CMA unconditional in April 2026. Final closing mechanics complete; distribution expected within weeks. Stock trades $40.10 against implied $40.59 — pure settlement arb at 1.2%. Risk is minimal — divestiture buyers have been pre-nominated and funded. Oilfield-services consolidation thesis continues to attract mid-cap follow-on candidates.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'CHX' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Boeing''s reabsorption of Spirit AeroSystems at 0.18 BA per SPR cleared DOJ in Q1 2026 after Airbus purchased the dedicated A220/A350 production lines in parallel. Stock trades $36.80 against implied $37.25 — a 1.2% spread to June closing. Boeing''s 737 recovery remains the underlying thesis; integration risk is operational (not antitrust). Watch for Airbus-site transfer timing — a slip past H2 2026 would reopen financing contingency.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'SPR' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Leonard Green''s $8.25 take-private of Mister Car Wash is in HSR review with closing targeted Q3 2026. Stock trades $7.80, a 5.8% spread reflecting PE-financing residual risk and standard second-request exposure on car-wash concentration. Leonard Green''s rollup playbook in the sector adds precedent value for subsequent PE take-privates in auto-services; break scenario is undisturbed around $6.70.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'MCW' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Salesforce''s $37 all-cash tender for Informatica cleared the DOJ vertical review in Q4 2026 without a second request; EU Phase I cleared with behavioural remedies on data-management interoperability. Stock trades $35.75 against the $37 offer — 3.5% spread to a December closing window. CMA sign-off is the final hard gate. Deal consolidates the master-data-management stack into Salesforce''s platform; integration risk is post-close customer churn, not regulatory.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'INFA' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'AbbVie''s $45 all-cash acquisition of Cerevel Therapeutics closed August 2024, delivering 100% of the merger-arb spread from the December 2023 announce. The neuroscience pipeline (schizophrenia + Parkinson''s) now integrated into AbbVie''s R&D platform; emraclidine Phase III readout remains the post-close catalyst. Set a template for neuroscience-pipeline M&A at scale — subsequent Lilly and Lundbeck deals referenced the valuation framework.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'CERE' AND category = 'MERGER';

UPDATE deals SET
  ai_commentary = 'Elliott''s $5B stake in Honeywell catalysed a three-way separation plan: Aerospace, Automation, and Buildings. HON committed to Aerospace + Automation spins by 2027; Buildings decision pending Q1 2027. Aerospace Form 10 filed and tracking January 2027 effectiveness; standalone EBITDA disclosed at $4.8B on a $220B backlog. The pre-spin stub trade is live; Automation Form 10 drafted. Risk is execution timing — a slip into H2 2027 compresses the SOTP re-rating window.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'HON' AND category = 'ACTIVISM';

UPDATE deals SET
  ai_commentary = 'Elliott''s stake in Starbucks catalysed Brian Niccol''s appointment as CEO in August 2024 following his Chipotle turnaround. Monitoring is now operational, not activist — comparable-store sales and international execution the main metrics. The Q1 2027 progress check against the Niccol operating plan is the next material datapoint. Elliott has not disclosed a position reduction; stake remains strategic.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'SBUX' AND category = 'ACTIVISM';

UPDATE deals SET
  ai_commentary = 'Elliott''s October 2024 settlement with Southwest installed six new directors and preserved Bob Jordan as CEO. Operational overhaul in execution: assigned seating phased in Q3 2025, red-eye capacity added for summer 2026, longer-range route rationalisation ongoing. Stock +28% over the campaign window. Watch the full-year 2026 operating-margin print vs the Elliott plan — a miss reopens the board-pressure cycle.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'LUV' AND category = 'ACTIVISM';

UPDATE deals SET
  ai_commentary = 'Elliott''s $5B stake in BP escalated to a proxy contest in February 2025: four board seats sought, capital return accelerated, refining divestiture mandated. AGM May 2027 is the binary vote. Proxy advisors ISS/GL have not yet published recommendations; shareholder base skew to retail complicates the count. If Elliott wins seats, downstream separation moves from thesis to mandate within 12 months. Break scenario (Elliott loses) keeps BP at current perpetual-underperformer valuation.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'BP' AND category = 'ACTIVISM';

UPDATE deals SET
  ai_commentary = 'Elliott''s settlement with Match Group installed a new CEO and four directors in Q1 2026. Hinge spin-off and Tinder strategic review now under board mandate. Hinge IPO expected on NYSE in March 2027 at indicated $4-5B valuation. Match stock has responded to the catalyst — carry trade on the spin-off remains constructive. Risk is Tinder monetisation deterioration pressuring the parent valuation ahead of the Hinge distribution.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'MTCH' AND category = 'ACTIVISM';

UPDATE deals SET
  ai_commentary = 'Ancora''s $1B stake campaign at Norfolk Southern settled in May 2024 with three board seats and operational commitments. CEO Mark George installed December 2024. Operating-ratio target of 65% by 2027 — down from the 72% pre-campaign baseline — is the measurable deliverable. Watch Q4 2026 operating print for progress; a miss would reopen activist pressure, this time potentially from a different shareholder. Ohio derailment litigation remains contained but not resolved.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'NSC' AND category = 'ACTIVISM';

UPDATE deals SET
  ai_commentary = 'Spirit Airlines converted to Chapter 7 liquidation in May 2026 after the Frontier merger collapsed and the JetBlue combination was blocked. A321neo fleet sold to Air Lease at ~$3.1B; Free Spirit loyalty program absorbed by American Airlines. Unsecured creditors: 15 cents. Senior secured: 72 cents. The case closes the US ultra-low-cost-carrier consolidation playbook — regulatory posture removed the last viable M&A exit.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'SAVE' AND category = 'DISTRESSED';

UPDATE deals SET
  ai_commentary = 'Altice USA''s out-of-court restructuring signed with 82% of first-lien creditors in October 2026. Drahi dilutes from 60% to 18% equity; FCC change-of-control cleared. Senior secured expected 85-90 cents, fulcrum sits at 2L which recovers 40-50 cents. Closing targeted February 2027 pending final exchange mechanics. Post-close, Altice USA emerges with $4B less debt and a restructured capital stack; equity thesis depends on subscriber reacceleration.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'ATUS' AND category = 'DISTRESSED';

UPDATE deals SET
  ai_commentary = 'CommScope''s refi talks with Deutsche Bank and JPM collapsed in October 2026; 10-K going-concern language expected. Senior secured trades 62-72 cents, fulcrum migrated from secured to 2L. Full OOC term sheet expected mid-February 2027. Andrew divestiture ($2.1B) priced in but incompletely signed. Risk is a hard pivot to Ch 11 if the 2L steering committee rejects the exchange — recovery cliff is 55 cents at 2L on a Ch 11 outcome.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'COMM' AND category = 'DISTRESSED';

UPDATE deals SET
  ai_commentary = 'Bausch Health carries $22.4B of legacy Valeant debt against a 2027 maturity wall ($4.8B). Xifaxan patent cliff in 2028 removes primary cash-flow source. BLCO distribution (82% of Bausch & Lomb to shareholders) is the near-term catalyst — timing contingent on IRS tax-free ruling and Section 355 compliance. OOC planning accelerating; refi scenarios limited by covenant headroom. Short equity carries on a BLCO delay or a Xifaxan generic launch acceleration.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'BHC' AND category = 'DISTRESSED';

UPDATE deals SET
  ai_commentary = 'Rite Aid''s plan confirmation hearing in June 2026 restructures the 1,100-store entity around the opioid-settlement $402M allocation. Secured creditors recover 78-84 cents; GUCs 12 cents. Post-emergence Rite Aid runs on 60% of pre-filing footprint, pivoting to specialty pharmacy. Watch confirmation hearing — if objections from state AGs on opioid allocation push the hearing past Q3, exit-financing terms deteriorate materially.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'RAD' AND category = 'DISTRESSED';

UPDATE deals SET
  ai_commentary = 'Honeywell Aerospace standalone Form 10 effectiveness expected January 2027 for a Q2 2027 distribution. Standalone EBITDA disclosed at $4.8B on $220B order backlog; pre-spin stub trade live and tracking the SOTP compression thesis. Index-exclusion dynamics at distribution will create wrong-hands selling; recommended entry window is day 1-30 post-distribution. Elliott''s $5B stake retained through separation, signalling continued engagement on Automation + Buildings.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_name = 'Honeywell Aerospace' AND category = 'SPINOFF';

UPDATE deals SET
  ai_commentary = 'Sanofi''s listing of consumer-health arm Opella on Euronext Paris targets September 2026 at €16B valuation. Sanofi retains 70%; CD&R''s earlier bid of €15.5B set the valuation floor. Parent re-rates as pure-play specialty pharma post-listing; multiple expansion of 1-2 turns fundable. Risk is French strategic-asset political pressure delaying the listing into Q1 2027 — the Ministère de l''Economie has signalled no veto but reserves comment on foreign-majority structures.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_name = 'Opella Healthcare' AND category = 'SPINOFF';

UPDATE deals SET
  ai_commentary = 'DuPont''s separation of Electronics & Industrial as a standalone pure-play AI-infrastructure story is now in final distribution mechanics for November 2026. E&I revenue of $7.5B, EBITDA $2.1B; the semiconductor-materials content positions the SpinCo at the center of advanced-packaging capex. Watch distribution-ratio disclosure and initial trading dynamics — AI-exposure premium should price in quickly post-split, mirroring GE Vernova''s +180% since its 2024 spin.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_name = 'DuPont Electronics & Industrial' AND category = 'SPINOFF';

UPDATE deals SET
  ai_commentary = 'IAC''s spin-off of Angi (home services) is scheduled for March 2027, completing Barry Diller''s multi-year IAC simplification after Match, Vimeo and Vimeo again. Angi standalone pivots from lead-generation to transactional-marketplace monetisation under new CEO. Distribution ratio TBD; pre-spin stub trade live. Risk is category-growth deceleration — a Q4 2026 bookings miss would reset the SpinCo valuation thesis before distribution.',
  ai_commentary_at = now(), ai_commentary_model = 'human_draft_2026-11-12'
WHERE target_ticker = 'ANGI' AND category = 'SPINOFF';

COMMIT;

-- ────────────────────────────────────────────────────────────────────
-- After running, verify:
--   SELECT category, count(*) FROM deals GROUP BY category;
--   → MERGER 15 · ACTIVISM 6 · DISTRESSED 5 · SPINOFF 4 = 30
--
--   SELECT target_name, left(ai_commentary, 60) FROM deals
--   WHERE ai_commentary IS NOT NULL ORDER BY category, target_name;
--   → 30 rows, each with a hand-written commentary tagged
--     ai_commentary_model = 'human_draft_2026-11-12'
--
-- Workflow at /admin/deals after this migration:
--   • All 30 rows show up with narrative + prob + timeline populated.
--   • BatchCommentaryButton says "0 without commentary" (every row
--     has one from this migration's UPDATE block).
--   • To regenerate a specific commentary with live Claude, open the
--     deal edit form and click "Generate with Claude" — the regenerated
--     text replaces the human_draft and the model/at fields are
--     overwritten with claude-sonnet-4-6 + current timestamp.
-- ────────────────────────────────────────────────────────────────────
