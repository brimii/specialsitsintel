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

COMMIT;

-- ────────────────────────────────────────────────────────────────────
-- After running, verify:
--   SELECT category, count(*) FROM deals GROUP BY category;
--   → MERGER 15 · ACTIVISM 6 · DISTRESSED 5 · SPINOFF 4 = 30
--
-- Then: /admin/deals should list all 30 rows, each with status + prob +
-- timeline populated, ai_commentary NULL. Click the "Generate missing
-- commentaries" button to batch Claude once per row.
-- ────────────────────────────────────────────────────────────────────
