// Données de contenu extraites de la maquette (pages Strategies, Regulators,
// Glossary, etc.). Restent en TS pour l'instant — migration Supabase ultérieure
// si nécessaire.

export type Strategy = {
  cat: string;
  col: string;
  bg: string;
  bd: string;
  title: string;
  sub: string;
  desc: string;
  ret: string;
  sr: string;
  dd: string;
  live: number;
  concepts: string[];
  risks: string[];
  exs: string[];
};

export type Regulator = {
  nm: string;
  cn: string;
  pos: string;
  col: string; // G / R / A
  rate: number;
  avg2: string;
  avg: string;
  fill: string;
  desc: string;
  stages?: string[];
};

export type GlossaryTerm = { t: string; d: string };

export const STRATS: Strategy[] = [
  {cat:"MERGER",col:"var(--g)",bg:"var(--gbg)",bd:"var(--gbd)",
   title:"Merger Arbitrage",sub:"Cash · Stock · Collar · Tender",
   desc:"Exploits the spread between target price and announced acquisition consideration. Cash deals: buy target, earn spread. Stock deals: buy target, short acquirer at exchange ratio. Profits from deal completion; losses from breaks.",
   ret:"6–15%",sr:"0.8–1.4",dd:"5–20%",live:20,
   concepts:["Annualized spread = (1 + net_spread/target)^(365/days) − 1. Enables cross-deal comparison regardless of timeline","Break price (undisturbed): estimated target price if deal fails — defines maximum downside, typically −20% to −60% from offer","FTC Second Request: information demand extending review 6–18 months — the single most important regulatory signal","Kelly sizing: f* = (p×b−q)/b. Half-Kelly institutional standard. 80% prob, 15% gain, 30% loss → 15.5% sizing","Collar mechanics: fixed collar = constant exchange ratio within range; floating = value stays constant as ratio adjusts","HSR thresholds 2024: $119.5M filing threshold. 30-day waiting period (15 days for cash tenders)"],
   risks:["Deal break resets to undisturbed: −30% to −60% typical loss on position","Regulatory block: FTC/DOJ/CFIUS prohibition — probability rising in horizontal tech/pharma","Timeline slippage: annualized return compresses without break risk — key underappreciated risk","Financing failure: LBO deals vulnerable to market dislocation — MAC clause invocation possible"],
   exs:["MSFT/ATVI $68.7B: FTC/CMA blocked then cleared — massive spread volatility","Capital One/Discover $35B: bank merger regulatory gauntlet — all cleared","Tapestry/Capri: FTC injunction granted — 45% spread → dead deal"]},
  {cat:"ACTIVISM",col:"var(--p)",bg:"var(--pbg)",bd:"rgba(157,124,248,.2)",
   title:"Event-Driven Activism",sub:"Board Campaigns · Separations · Capital Return",
   desc:"Accumulating 5%+ stakes (triggering 13D) and publicly advocating for strategic/governance change. Profit from stock re-rating. Catalysts: CEO changes, spin-offs, buybacks, operational improvement. Duration: 12–36 months.",
   ret:"10–25%",sr:"0.6–1.0",dd:"15–40%",live:8,
   concepts:["13D vs 13G: 13D for >5% with control intent (10 day filing). 13G for passive. 13D/A for amendments","Board campaigns: short-slate vs full-slate. Proxy fight cost $5–50M for large-cap — ISS/Glass Lewis support critical","SOTP analysis: conglomerate discount = (SOTP − market cap) / SOTP. Activist argument for separation","Proxy advisory firms: ISS + Glass Lewis control ~25-30% of institutional votes — obtaining their support is critical","Poison pill trigger: typically 10–20% threshold. Board adopts without shareholder vote","Staggered board: prevents full replacement in single proxy fight — must win two consecutive elections"],
   risks:["Entrenchment: poison pill, staggered board, white knight M&A as defensive measures","Activist fatigue: market stops pricing success probability if campaign drags beyond 24 months","Macro override: systemic decline overrides company-specific thesis","Proxy vote loss: losing damages credibility and may trigger selling pressure from sympathetic holders"],
   exs:["Elliott/Honeywell $145B: three-way split, $5B position, largest campaign by capital","Ancora/Norfolk Southern: CEO removal post East Palestine — smaller fund, mega-cap win","Elliott/Southwest: full CEO replacement + board reconstitution in under 6 months"]},
  {cat:"DISTRESSED",col:"var(--r)",bg:"var(--rbg)",bd:"var(--rbd)",
   title:"Distressed M&A & Credit",sub:"Chapter 11 · OOC Restructuring · 363 Sales",
   desc:"Targets companies in financial stress — debt at discount or in formal bankruptcy. Profits from recovery value exceeding purchase price through reorganization, 363 sale, or liquidation. Requires capital structure expertise and bankruptcy law knowledge.",
   ret:"15–35%",sr:"0.5–0.9",dd:"25–60%",live:10,
   concepts:["Absolute priority rule: senior paid in full before junior receives anything — administrative → secured → unsecured → equity","Fulcrum security: class at which recovery transitions from full to partial — typically converts to equity in reorganization","363 Sale: court-approved, free and clear of all liens. Stalking-horse sets floor, auction determines winner","DIP financing: super-priority credit senior to all pre-petition claims. DIP rate: SOFR+4-8%. Fees: 2-4%","Pre-packaged Ch.11: restructuring negotiated before filing — fastest path, most certainty","Loan-to-own: buy distressed debt at discount, convert to equity in restructuring — control-oriented strategy"],
   risks:["Adversarial process: creditor classes fight — outcome unpredictable even in senior positions","Liquidation risk: enterprise worth more dead than alive destroys going-concern value","Timeline extension: cases last 1–5 years — IRR destruction even with correct recovery estimate","Equitable subordination: court can subordinate claims for misconduct — loan-to-own risk"],
   exs:["WeWork 2023: equity zero, senior secured 65 cents, $12B lease obligations eliminated","Enviva 2024: biomass, fulcrum at 1L notes trading 60-70 cents","Yellow Corp: liquidation, 90 cent senior recovery, zero equity"]},
  {cat:"SPINOFF",col:"var(--b)",bg:"var(--bbg)",bd:"var(--bbd)",
   title:"Spin-offs & Separations",sub:"IRC §355 · SOTP Arbitrage · Wrong-Hands",
   desc:"Corporate separations create value through conglomerate discount elimination and strategic clarity. Spin-offs (tax-free under §355), split-offs (exchange parent for SpinCo), carve-outs (minority IPO). Both parent and SpinCo create event-driven opportunities.",
   ret:"8–20%",sr:"0.7–1.1",dd:"10–30%",live:7,
   concepts:["Conglomerate discount: diversified companies trade 15–25% below SOTP — core separation thesis","Wrong-hands selling: index funds must sell SpinCo they can't hold — creates systematic 30-90 day entry opportunity","IRC §355 requirements: active business 5 years, business purpose, not a E&P distribution device. IRS PLR required","Stub trade: buy SpinCo, short parent at SpinCo/parent ratio — pure SpinCo exposure without parent risk","Form 10: SpinCo registration statement — standalone financials, debt structure, risk factors. Key analytical document","Split-off: holders exchange parent for SpinCo shares — parent share count reduces (buyback equivalent)"],
   risks:["Parent retains legacy liabilities (pension, litigation) — SpinCo gets cleaner balance sheet but dependency remains","SpinCo management: often second-tier executives, limited public company experience","Index inclusion lag: S&P 500 inclusion takes quarters — persistent passive fund selling pressure","SpinCo into cyclical downturn: poor market timing destroys initial thesis regardless of SOTP math"],
   exs:["GE Vernova 2024: wrong-hands discount → +60% re-rating as grid demand confirmed","Kenvue 2023: J&J consumer health, post-spin -20% from litigation + staples compression","IAC/Angi 2025: Diller's eighth serial separation — each prior unlocked value"]},
  {cat:"REORG",col:"var(--a)",bg:"var(--abg)",bd:"var(--abd)",
   title:"Restructuring & OOC",sub:"Exchange Offers · Consent Solicitations · A&E",
   desc:"Out-of-court restructurings avoid bankruptcy through voluntary exchanges and bilateral negotiations. Faster (3-9 months vs 12-36 in court), cheaper ($50M+ professional fee savings). Requires 90%+ creditor cooperation — holdout problem is primary risk.",
   ret:"12–22%",sr:"0.6–1.0",dd:"20–40%",live:4,
   concepts:["Exchange offer: new securities at improved terms to induce voluntary debt swap — standard first step","Consent solicitation: pays fees to modify indenture covenants without full exchange","Amend-and-extend (A&E): pushes maturity wall out in exchange for higher rate or new collateral","Holdout problem: minority creditor blocks OOC to extract better terms — can force bankruptcy if >10%","RSA (Restructuring Support Agreement): binding commitment from creditor classes — OOC/pre-pack prerequisite","Fulcrum negotiation: creditors at fulcrum have most leverage — both take haircut AND receive equity upside"],
   risks:["Holdout creditors can force bankruptcy if OOC doesn't hit threshold participation","Regulatory approval: FCC, banking regulators required for telecom/financial OOC — adds timeline","Founding shareholder obstruction: Drahi-style resistance to dilution even at expense of creditor value","Subsequent bankruptcy: court may re-examine OOC terms as preferential or fraudulent transfers"],
   exs:["Lumen Technologies: $15B OOC completed Nov 2024 — largest US telecom OOC","Altice USA: $25B→$15B exchange in process — Drahi friction ongoing","DISH/DirecTV: satellite TV consolidation resolving EchoStar debt stack"]},
  {cat:"TENDER",col:"var(--g)",bg:"var(--gbg)",bd:"var(--gbd)",
   title:"Tender Offers & Take-Privates",sub:"Direct Bids · LBOs · Settlement Mechanics",
   desc:"Direct bids to shareholders bypassing the board. SC TO-T filing. Minimum 20 business-day acceptance period. Going-privates offer 20-40% premiums. PE-sponsored LBO take-privates add financing risk as distinct deal risk layer.",
   ret:"5–12%",sr:"0.9–1.4",dd:"3–18%",live:2,
   concepts:["SC TO-T: tender offer statement. SC 14D-9: target board recommendation — read both immediately on announcement","Proration: if more shares tendered than sought, proportional acceptance at each holder level","Any-and-all vs partial: any-and-all buys 100% tendered; partial creates stub equity at holdover price","Minimum tender condition: typically 50.1% or 80%+ — lapses if insufficient shares tendered","Squeeze-out: 90%+ ownership → remaining holders cashed out without vote — short-form merger","MAC clause: acquirer walk-right if target deteriorates. Courts rarely allow — Akorn v. Fresenius (2018) landmark exception"],
   risks:["CFIUS for foreign acquirers — national security block even after tender fully subscribed","LBO financing failure: debt market closure during pending period. MAC invocation possible","Minimum condition: too few shareholders tender — deal lapses without break fee","Unsolicited: board poison pill, staggered board, white knight — hostile tender expensive and uncertain"],
   exs:["Squarespace/Permira $6.9B: clean take-private, HSR cleared, 97% probability","US Steel/Nippon $14.9B: all-cash tender, CFIUS presidential block — binary","Endeavor/Silver Lake $13B: entertainment/sports take-private, HSR cleared"]},
  {cat:"CAPSTRUCT",col:"var(--r)",bg:"var(--rbg)",bd:"var(--rbd)",
   title:"Capital Structure Arbitrage",sub:"CVRs · Collars · Stub Trades",
   desc:"Exploits pricing discrepancies across different securities of the same company or related entities in complex transactions. CVR valuation, merger election mechanics, collar hedging, stub equity, SPAC redemption, CEF NAV discount. Simultaneous multi-instrument analysis required.",
   ret:"8–18%",sr:"0.7–1.2",dd:"12–28%",live:3,
   concepts:["CVR (Contingent Value Right): additional payment contingent on regulatory outcome or milestone. Often at deep discount to expected value","Election mechanics: cash/stock election in mixed deals — proration when over-subscribed for any class","Fixed vs floating collar: fixed = constant ratio within range; floating = value stays constant as ratio adjusts for acquirer moves","Stub equity: residual parent interest post-SpinCo distribution — trades at deep SOTP discount initially","SPAC redemption: buy at/below trust value ($10.20 typically) — redeem if deal unattractive to capture trust yield","CEF NAV discount: closed-end fund trades below NAV — catalyst required for convergence to intrinsic value"],
   risks:["CVR binary outcome — regulatory or milestone events create binary risk on contingent consideration","Collar mishedging: acquirer stock outside collar = unhedged residual exposure","Stub worthless if parent retains all value-creating assets post-separation","SPAC extension: trust eroded by warrants and admin costs if timeline extends"],
   exs:["BMS/Celgene CVR: $9/share on Otezla approval — traded 30 cents to $9","AbbVie/Allergan collar: $140-$175 floating — massive spread volatility on AbbVie moves","GE breakup: three concurrent SpinCo/stub opportunities across HealthCare, Vernova, Aerospace"]},
];

export const REGS: Regulator[] = [
  {nm:"FTC Antitrust",cn:"🇺🇸 United States",pos:"Moderating",rate:79,col:"A",fill:"#ffb223",avg:"14 months (Phase II)",avg2:"30 days (Phase I)",
   desc:"Post-2021 hawkish leadership drove block rate from 3% to 8%. Chair transition 2025 brings more pragmatic approach. Second Request is key signal — adds 6–18 months. Current focus: tech, pharma, healthcare services.",
   stages:["HSR Filing","Initial Review (30d)","Second Request?","Phase II Investigation","Resolution/Consent"]},
  {nm:"DOJ Antitrust",cn:"🇺🇸 United States",pos:"Moderating",rate:81,col:"A",fill:"#ffb223",avg:"12 months (Phase II)",avg2:"30 days (Phase I)",
   desc:"Coordinates with FTC on case allocation by industry. Successful challenges: Aetna/Humana, Anthem/Cigna. Recent moderation on vertical theories after court defeats (US v. AT&T). Tech sector remains high-scrutiny.",
   stages:["HSR Filing","Investigation","CID (Civil Investigative Demand)","Negotiation","Consent or Lawsuit"]},
  {nm:"DG COMP",cn:"🇪🇺 European Union",pos:"Favorable",rate:88,col:"G",fill:"#1e3a72",avg:"25 days (Phase I)",avg2:"90 working days (Phase II)",
   desc:"Phase I clears 95%+ of notified deals. Phase II investigations take 90+ working days. Gun-jumping prohibition strictly enforced. Mandatory when EU thresholds met (€5B worldwide, €250M EU each).",
   stages:["Pre-notification Discussions","Phase I (25 working days)","Phase II Opening","Statement of Objections","Remedies/Decision"]},
  {nm:"CMA",cn:"🇬🇧 United Kingdom",pos:"Moderate",rate:82,col:"A",fill:"#ffb223",avg:"24 weeks (Phase II)",avg2:"40 working days (Phase I)",
   desc:"Post-Brexit operates independently of DG COMP — bilateral approvals needed for UK+EU deals. Phase 2 mandatory when SLC found. Known for thorough investigations, especially in tech. Four-month Duty to Refer.",
   stages:["Phase 1 (40 working days)","SLC Assessment","Phase 2 Panel (24 weeks)","Provisional Decision","Remedies"]},
  {nm:"CFIUS",cn:"🇺🇸 United States",pos:"Hawkish",rate:71,col:"R",fill:"#a83232",avg:"45 days (initial)",avg2:"45 days (investigation)",
   desc:"Reviews foreign acquisitions for national security. Determinations confidential. Presidential prohibition authority. FIRRMA (2018) expanded scope to: semiconductor, defense, critical infrastructure, personal data, ports.",
   stages:["Voluntary Declaration","Review (45 days)","Investigation (45 days)","Mitigation Negotiations","Presidential Review","Clearance or Prohibition"]},
  {nm:"JFTC",cn:"🇯🇵 Japan (Antitrust)",pos:"Favorable",rate:91,col:"G",fill:"#1e3a72",avg:"30 days (Phase I)",avg2:"4 months (Phase II)",
   desc:"High historical clearance rate. Domestic consolidation readily approved. Post-2023 merger guidelines updated. Phase I typically 30 days. Phase II rare. Coordinates with FEFTA for foreign acquirers.",
   stages:["Prior Consultation","Formal Filing","Phase I (30 days)","Phase II if needed","Remedies","Clearance"]},
  {nm:"FEFTA",cn:"🇯🇵 Japan (Foreign Investment)",pos:"Hawkish",rate:62,col:"R",fill:"#a83232",avg:"Variable",avg2:"30 days initial",
   desc:"Separate from antitrust — reviews inbound foreign investment for national security. Sensitive sectors: semiconductor, defense, telecoms, utilities, broadcasting. Seven&i/Couche-Tard is current live example. Opacity is a risk.",
   stages:["Pre-filing Consultation","Prior Notification","Initial Review (30d)","Examination (90d)","Modification/Prohibition","Clearance"]},
  {nm:"ACCC",cn:"🇦🇺 Australia",pos:"Accommodating",rate:85,col:"G",fill:"#1e3a72",avg:"9 months",avg2:"4 months (Phase I)",
   desc:"2024 reform: mandatory pre-merger notification replacing voluntary informal review. Enhanced investigation powers. Historically accommodating — tech sector scrutiny increasing. Grocery sector under heightened review.",
   stages:["Mandatory Notification","Public Review","Market Inquiries","ACCC Decision","Possible Tribunal Review"]},
  {nm:"AMF",cn:"🇫🇷 France",pos:"Favorable",rate:93,col:"G",fill:"#1e3a72",avg:"6 months",avg2:"25 days conformity",
   desc:"Regulates French public tenders (OPA/OPE). Conformité declaration required before launch. Squeeze-out mandatory at 90%. Mandatory bid (garantie de cours) triggered at 30%. Retrait obligatoire at 90%+.",
   stages:["Offer Filing","Conformity Declaration (25 days)","Acceptance Period (25d min)","Results Publication","Squeeze-out if 90%+"]},
  {nm:"FCA / Takeover Panel",cn:"🇬🇧 United Kingdom",pos:"Neutral",rate:89,col:"G",fill:"#1e3a72",avg:"28 days offer period",avg2:"4 months total",
   desc:"City Code on Takeovers. No false market rule strictly enforced. Mandatory bid at 30%. Offer must complete or lapse by Day 60. Squeeze-out at 90%. Takeover Panel operates with judicial efficiency.",
   stages:["Rule 2.7 Announcement","Offer Document (Day 28)","Acceptance Period","Day 60 Deadline","Squeeze-out if 90%"]},
  {nm:"BKartA",cn:"🇩🇪 Germany",pos:"Moderate",rate:85,col:"A",fill:"#ffb223",avg:"4 months Phase I",avg2:"7 months Phase II",
   desc:"Bundeskartellamt. Expanded §19a powers for digital platforms. Domestic deals at EU thresholds escalated to DG COMP. Supermarket, fuel, digital sectors under heightened review.",
   stages:["Filing","Phase I (4 months)","SLC Assessment","Phase II (3 months)","Remedies","Decision"]},
  {nm:"SAMR",cn:"🇨🇳 China",pos:"Hawkish",rate:74,col:"R",fill:"#a83232",avg:"12–18 months",avg2:"30 days Phase I",
   desc:"Mandatory if worldwide >¥10B and China revenue each >¥400M. US/China tensions create unpredictable treatment. Silent approval (no decision after period = approved) common strategy. Behavioral remedies more common than blocks.",
   stages:["Pre-filing Consultation","Phase I (30d)","Phase II (90d)","Phase III (60d)","Decision or Silent Approval"]},
  {nm:"CADE",cn:"🇧🇷 Brazil",pos:"Moderate",rate:83,col:"A",fill:"#ffb223",avg:"240 days",avg2:"60 days fast-track",
   desc:"Mandatory pre-merger notification. Fast-track for limited horizontal overlap. Natural resources, banking, telecoms, pharma under most scrutiny. Remedies common in concentrated sectors.",
   stages:["Notification","Fast-track or Ordinary","Market Analysis","Negotiation/Remedies","Decision"]},
  {nm:"KFTC",cn:"🇰🇷 South Korea",pos:"Moderate",rate:86,col:"A",fill:"#ffb223",avg:"5 months",avg2:"30 days Phase I",
   desc:"Pre-merger notification above thresholds. Semiconductor and display panel deals face enhanced scrutiny given Korea's strategic supply position. Chaebol cross-ownership adds complexity. Business-friendly generally.",
   stages:["Notification Filing","Phase I (30 days)","Extended Review (90d)","Impact Assessment","Approval or Conditional"]},
  {nm:"ISED / Investment Canada",cn:"🇨🇦 Canada",pos:"Moderate",rate:80,col:"A",fill:"#ffb223",avg:"6 months",avg2:"45 days initial",
   desc:"Investment Canada Act: net benefit review for foreign acquisitions above thresholds. National security review separate. Rogers/Shaw illustrated ISED power — initial block then conditional approval (Freedom Mobile divestiture).",
   stages:["Filing","Net Benefit Review","National Security Screen","Commitments/Undertakings","Ministerial Decision"]},
];

export const GLOS: GlossaryTerm[] = [
  {t:"Annualized Spread",d:"(1 + net_spread/target)^(365/days_to_close) − 1. Converts gross spread to annual return. Enables cross-deal comparison. Always use business days for close date calculations."},
  {t:"Break Price (Undisturbed)",d:"Estimated target price if deal fails. Based on pre-announcement technicals, fundamental valuation, or sector comps. Defines maximum downside. Typical range: −20% to −60% from offer price."},
  {t:"Expected Value (EV)",d:"EV = (P_close × gain) + (P_break × loss) + (P_renego × outcome). Three-scenario model. Annualized EV for timeline comparison. Positive EV = position pays in expectation across the probability distribution."},
  {t:"Kelly Criterion",d:"f* = (p×b−q)/b. p = win probability, b = win/loss ratio, q = 1−p. Half-Kelly (f*/2) = institutional standard. Example: 80% prob, 15% gain, 30% loss → f* = 31%, Half-Kelly = 15.5%."},
  {t:"Second Request (HSR)",d:"Information demand from FTC or DOJ after initial 30-day waiting period. Signals serious concern. Suspends waiting period until substantial compliance — typically adds 6–18 months."},
  {t:"CFIUS",d:"Committee on Foreign Investment in the United States. Reviews foreign acquisitions for national security under FINSA. Determinations confidential. FIRRMA (2018) expanded to semiconductor, AI, personal data, ports."},
  {t:"HSR Act",d:"Hart-Scott-Rodino (1976). Pre-merger notification required above $119.5M (2024). 30-day waiting period (15 days for cash tenders and bankruptcy sales)."},
  {t:"SC 13D / 13G",d:"13D: activist disclosure within 10 business days of crossing 5% with control intent. 13G: passive investor version. 13D triggers 10-day cooling-off on additional purchases."},
  {t:"Absolute Priority Rule",d:"In bankruptcy: each class paid in full before junior receives anything. Administrative → secured → senior unsecured → subordinated → preferred → common. Exceptions: new value contributions, cramdown."},
  {t:"Fulcrum Security",d:"The class at which recovery transitions from full to partial at assumed enterprise valuation. Fulcrum class converts to equity in reorganization. Identifying fulcrum is central distressed analytical task."},
  {t:"363 Sale",d:"Asset sale in Ch.11 under Bankruptcy Code §363, with court approval. Sold free and clear of all liens. Stalking-horse establishes floor; open auction determines winner."},
  {t:"DIP Financing",d:"Debtor-in-Possession financing: emergency credit to Ch.11 debtor, super-priority over all pre-petition claims. Rate: SOFR+4-8%. Fees: 2-4%. DIP lenders often positioned for loan-to-own."},
  {t:"IRC §355",d:"US tax section enabling tax-free spin-offs. Requirements: active business (5 years), business purpose, not an E&P distribution device. IRS private letter ruling required. Five-year M&A restriction on SpinCo."},
  {t:"Wrong-Hands Selling",d:"Post-spin, institutional holders who can't hold SpinCo mandates are forced sellers. Index funds sell SpinCos not yet in indices. Creates systematic 30-90 day selling pressure and entry opportunity."},
  {t:"Sum-of-Parts (SOTP)",d:"Valuing each segment at appropriate industry multiples and summing. Conglomerate discount = (SOTP − market cap) / SOTP. Activist catalyst: narrowing discount through separation or capital return."},
  {t:"MAC Clause (MAE)",d:"Material Adverse Change: acquirer walk-right if target business deteriorates significantly. Heavily negotiated — excludes industry-wide events and market moves. Courts rarely allow (Akorn v. Fresenius 2018 is landmark exception)."},
  {t:"Go-Shop Period",d:"Post-signing window (25-45 days typically) for target to solicit competing bids. Common in PE/LBO deals to demonstrate fiduciary process. Lower breakup fee during go-shop; standard fee applies after."},
  {t:"CVR (Contingent Value Right)",d:"Right to additional consideration contingent on future event: regulatory approval, clinical trial milestone, litigation outcome. Traded separately. Often at deep discount to expected value due to binary nature."},
  {t:"Collar Structure",d:"In stock deals: exchange ratio varies within a price range. Fixed collar = constant ratio throughout. Floating collar = value stays constant as ratio adjusts. Outside collar = one party bears price risk."},
  {t:"Proration",d:"When more shares tendered than sought, holders receive proportional acceptance. Example: 60% proration means only 60% of tendered shares accepted. Creates stub equity position for untendered balance."},
  {t:"DEFM14A (Definitive Proxy)",d:"SEC-required proxy sent to target shareholders for merger approval vote. Contains: deal terms, background of negotiations, fairness opinion, risk factors, vote instructions. Primary document for merger arb analysis."},
  {t:"Loan-to-Own",d:"Strategy: purchase distressed debt at discount with intention to convert to equity in restructuring. Seeks control of reorganized entity. Risk: equitable subordination if court finds creditor misconduct."},
];


export type Macro = { l: string; v: string; d: string; tr: string; col: string };
export type RegimePoint = { t: string; d: string };
export type RegimeExposure = { l: string; v: number; dir: string; c: string };
export type RegimeHistory = { p: string; d: string };
export type Regime = {
  cat: string;
  title: string;
  icon: string;
  col: string;
  bg: string;
  bd: string;
  sub: string;
  current: string;
  curCol: string;
  curBg: string;
  curNote: string;
  best: RegimePoint[];
  worst: RegimePoint[];
  exposures: RegimeExposure[];
  history: RegimeHistory[];
};
export type CurrentRegime = {
  icon: string;
  name: string;
  desc: string;
  vix: number;
  fedfunds: number;
  asOf: string;
};
export type HistDeal = {
  cat: string;
  yr: string;
  nm: string;
  acq: string;
  v: string;
  ret: string;
  dur: string;
  desc: string;
  out: string;
  lesson: string;
  sym?: string;
};

export const CUR_REGIME: CurrentRegime = {
  name:'Risk-On with Rate Plateau',
  icon:'⛅',
  desc:'Equity markets at all-time highs on AI earnings + soft landing confirmation. Fed on hold at 4.50% — no cuts until Q4 2026. M&A activity surging: 18 new deals >$1B in May alone. Merger arb spreads tight in cleared deals, selective opportunities in contested situations and early-stage deals.',
  asOf:'May 20, 2026',
  vix:13.2,
  fedfunds:4.50
};

export const MACRO: Macro[] = [
  {l:'VIX',v:'13.2',d:'-2.4 vs 3m',tr:'down',col:'g'},
  {l:'10Y UST',v:'4.28%',d:'-4bps vs 1m',tr:'down',col:'g'},
  {l:'HY OAS',v:'298bps',d:'-7bps vs 1m',tr:'down',col:'g'},
  {l:'Fed Funds',v:'4.50%',d:'Hold — no cut Q3',tr:'flat',col:'g'},
  {l:'M&A Deal Flow',v:'$1.4T',d:'YTD, +22% YoY',tr:'up',col:'g'},
  {l:'HFRI Merger Arb',v:'+6.8%',d:'YTD May 2026',tr:'up',col:'g'},
  {l:'Default Rate (HY)',v:'3.6%',d:'+50bps vs 1y',tr:'up',col:'a'},
  {l:'LBO Activity',v:'$310B',d:'YTD, +8% YoY',tr:'up',col:'g'},
  {l:'CFIUS Block Rate',v:'9%',d:'vs 3% LT avg',tr:'up',col:'r'},
  {l:'AI Capex Wave',v:'$320B',d:'2026E hyperscaler',tr:'up',col:'g'},
];

export const REGIMES: Regime[] = [
  {cat:'MERGER',title:'Merger Arbitrage',icon:'⊞',col:'#1e3a72',bg:'rgba(30,58,114,.1)',bd:'rgba(30,58,114,.25)',sub:'Cash · Stock · Tender',
   current:'Mixed',curCol:'#9c6d2a',curBg:'rgba(245,166,35,.15)',
   curNote:'Spreads compressed in cleared deals; widening in contested. Half-Kelly default.',
   best:[
    {t:'Stable interest rates',d:'Predictable LBO financing and tight bid-ask. Funds can lever positions efficiently.'},
    {t:'Low equity volatility (VIX < 18)',d:'Spreads behave; deal break correlation low. Risk-adjusted returns optimal.'},
    {t:'Accommodative antitrust posture',d:'Block rate near 3% historical average. Second Requests rare. Timelines predictable.'},
    {t:'Healthy IG/HY credit',d:'OAS tight = financing certain. Reverse termination fees rare. Deals close at announced terms.'},
   ],
   worst:[
    {t:'Risk-off / VIX spike > 30',d:'Spreads widen indiscriminately. Funds forced to delever. Negative carry on undisturbed reversion.'},
    {t:'Hawkish antitrust (post-2021)',d:'Block rate 8%+. Second Requests routine. Timelines extend 6-18 months. Spread widening on FTC language.'},
    {t:'Credit dislocation (OAS > 500bps)',d:'LBO financing pulls. MAC clause invocations spike. Reverse termination fees increase.'},
    {t:'Geopolitical shock + CFIUS',d:'Cross-border tech/semi deals hit CFIUS. Binary block risk on $10B+ deals (US Steel, Broadcom/Qualcomm).'},
   ],
   exposures:[
    {l:'Rates',v:35,dir:'short',c:'a'},
    {l:'Volatility',v:60,dir:'short',c:'r'},
    {l:'Credit',v:45,dir:'long',c:'a'},
    {l:'Liquidity',v:25,dir:'long',c:'g'},
    {l:'Cycle',v:30,dir:'neutral',c:'g'},
   ],
   history:[
    {p:'2009-2014',d:'<b>Golden era.</b> Low rates, low vol, accommodative antitrust. HFRI Merger Arb +7-9% annualized. Half-Kelly safe.'},
    {p:'2018-2019',d:'<b>Trade war disruption.</b> CFIUS block rate spike. Broadcom/Qualcomm blocked. Cross-border deals impaired.'},
    {p:'2022-2023',d:'<b>Lina Khan FTC era.</b> Block rate 8%. Microsoft/Activision, Albertsons/Kroger all challenged. Spreads gapped wider.'},
    {p:'2024-2025',d:'<b>Moderation.</b> FTC leadership transition. Block rate normalizing. Spread compression in cleared deals; selectivity rewarded.'},
   ]},

  {cat:'ACTIVISM',title:'Event-Driven Activism',icon:'✦',col:'#9d7cf8',bg:'rgba(157,124,248,.1)',bd:'rgba(157,124,248,.25)',sub:'13D · Board Campaigns · SOTP',
   current:'Favorable',curCol:'#1e3a72',curBg:'rgba(30,58,114,.15)',
   curNote:'Conglomerate discounts widening + management pressure rising. Elliott, Starboard active.',
   best:[
    {t:'Low growth / sideways markets',d:'When organic growth lacks, structural change drives returns. SOTP arbitrage and capital return the alpha source.'},
    {t:'Elevated conglomerate discount',d:'Discount > 20% historical. Activists nominate boards, force separation. GE, J&J, Honeywell playbooks.'},
    {t:'Rising rates / financial discipline',d:'Buyback yield > cost of capital. Activists push capital return. Excess cash deployment thesis works.'},
    {t:'Sector rotation regimes',d:'Conglomerates suffer in style rotations (growth → value). Separations unlock pure-play multiple expansion.'},
   ],
   worst:[
    {t:'Strong bull markets (TINA)',d:'Index funds dominate. Activist pressure diluted. CEO entrenchment easier when stock up. Disney/Peltz lost on TINA.'},
    {t:'Crisis market (2008, 2020)',d:'Activists pull back. Defensive M&A, poison pills universally adopted. Engagement froze in March 2020.'},
    {t:'Heavy retail flow / meme dynamics',d:'Institutional vote share diluted. Proxy advisory (ISS, GL) less determinative. Activist thesis disrupted.'},
    {t:'Hot tech bubbles',d:'Conglomerate discounts compress as growth multiples expand. SOTP thesis fails. Buy-and-hold beats SOTP.'},
   ],
   exposures:[
    {l:'Rates',v:60,dir:'long',c:'g'},
    {l:'Volatility',v:30,dir:'neutral',c:'g'},
    {l:'Credit',v:25,dir:'neutral',c:'g'},
    {l:'Liquidity',v:55,dir:'long',c:'a'},
    {l:'Cycle',v:50,dir:'short',c:'a'},
   ],
   history:[
    {p:'2013-2015',d:'<b>Peak era.</b> Trian/PEP, Ackman/HLF, Icahn/AAPL. Mega-cap engagement worked. HFRI Activist +10-14% annualized.'},
    {p:'2020-2021',d:'<b>SPAC boom diluted activism.</b> Cheap capital reduced activist leverage. Disney/Peltz defeated on TINA.'},
    {p:'2023-2024',d:'<b>Resurgence.</b> Elliott/Honeywell, Ancora/NSC, Starboard/Salesforce. Conglomerate discounts back in focus.'},
    {p:'2025+',d:'<b>European push.</b> Elliott/BP, expanding into UK and EU where activism historically harder. Regulatory landscape softening.'},
   ]},

  {cat:'DISTRESSED',title:'Distressed Credit & M&A',icon:'⊟',col:'#a83232',bg:'rgba(240,85,85,.1)',bd:'rgba(240,85,85,.22)',sub:'Chapter 11 · OOC · 363',
   current:'Building',curCol:'#9c6d2a',curBg:'rgba(245,166,35,.15)',
   curNote:'Default rate rising (3.4% vs 2.1% trough). Maturity wall 2026-27. Selective opportunities now, full cycle ahead.',
   best:[
    {t:'Credit stress regime (HY OAS > 500bps)',d:'Forced selling creates fulcrum discounts. PE-backed retail/energy stress provides deep value.'},
    {t:'Recession or pre-recession',d:'Default rate spikes 4-8%. Massive opportunity set. 2009, 2020 distressed vintages delivered 25%+ IRR.'},
    {t:'Sector-specific distress',d:'Energy 2014-16, retail 2017-19, commercial real estate 2024-26. Sector-specific edge compounds.'},
    {t:'Falling rate environment',d:'Distressed exits via refinancing become viable again. Reorganized equities re-rate on lower discount rate.'},
   ],
   worst:[
    {t:'Late-cycle credit boom',d:'No defaults = no opportunities. Spreads tight. Cov-lite deals = lower recovery. Yellow Corp couldn\'t emerge.'},
    {t:'Persistent QE / liquidity flood',d:'Zombies refinance. Default rate suppressed. Distressed funds raise but can\'t deploy. 2015-2019 funds underperformed.'},
    {t:'Rapidly rising rates with credit panic',d:'Mark-to-market losses on existing positions overwhelm new vintage IRR. 2022 distressed funds drew down 15-25%.'},
    {t:'Strong bull equity markets',d:'Reorganized equities orphaned. Wrong-hands selling intense. Fulcrum-as-equity strategy struggles to monetize.'},
   ],
   exposures:[
    {l:'Rates',v:70,dir:'short',c:'r'},
    {l:'Volatility',v:45,dir:'long',c:'a'},
    {l:'Credit',v:85,dir:'long',c:'r'},
    {l:'Liquidity',v:75,dir:'short',c:'r'},
    {l:'Cycle',v:80,dir:'short',c:'r'},
   ],
   history:[
    {p:'2009-2011',d:'<b>Legendary vintage.</b> Lehman/Bear aftermath. Oaktree, Apollo, Cerberus IRRs 25%+. Generational entry.'},
    {p:'2015-2016',d:'<b>Energy distress.</b> Oil crash → 100+ E&P bankruptcies. Sector specialists generated 20%+ returns.'},
    {p:'2020',d:'<b>COVID dislocation.</b> Brief but extreme. Hertz, Chesapeake, retail. Funds with dry powder generated 30%+ returns.'},
    {p:'2024-2026',d:'<b>Maturity wall building.</b> Default rate 3.4% rising. WeWork, Yellow, Spirit, Bayer setting up. PE-leveraged retail leading.'},
   ]},

  {cat:'SPINOFF',title:'Spin-offs & Separations',icon:'⊕',col:'#3760a0',bg:'rgba(55,96,160,.1)',bd:'rgba(55,96,160,.22)',sub:'IRC §355 · Stub · Wrong-Hands',
   current:'Favorable',curCol:'#1e3a72',curBg:'rgba(30,58,114,.15)',
   curNote:'Elevated conglomerate discounts + management willingness. GE, J&J, Honeywell, Sanofi pipeline.',
   best:[
    {t:'Value rotation regimes',d:'When market favors pure-plays over conglomerates, SOTP discount compresses on separation. GE Vernova +60% post-spin.'},
    {t:'Conglomerate discount > 20%',d:'Wide discount = clear unlock thesis. J&J/Kenvue, GE trifecta, Honeywell three-way prove the playbook.'},
    {t:'Index reconstitution windows',d:'Wrong-hands selling at predictable moments. Buying SpinCo at index exit is highest-probability entry.'},
    {t:'Activist-driven separations',d:'Elliott, Trian, Starboard catalyzing separations. Better SpinCo management teams and capital allocation.'},
   ],
   worst:[
    {t:'Conglomerate premium regimes',d:'Tech bubbles compress SOTP discount. Bigger = better. Buying separated company at premium destroys thesis.'},
    {t:'Crisis markets',d:'SpinCo new debt issuance distressed. Distribution timing horrible. Wrong-hands sellers panic. Form 10 SpinCos crater.'},
    {t:'Sector cyclical downturn at spin',d:'Standalone SpinCo into sector downturn = double whammy. Solventum post-spin into medtech weakness -15%.'},
    {t:'Heavy passive flows',d:'Index inclusion lag = persistent selling. Solventum took 18 months to find institutional ownership balance.'},
   ],
   exposures:[
    {l:'Rates',v:40,dir:'short',c:'a'},
    {l:'Volatility',v:35,dir:'long',c:'g'},
    {l:'Credit',v:30,dir:'neutral',c:'g'},
    {l:'Liquidity',v:65,dir:'short',c:'a'},
    {l:'Cycle',v:55,dir:'neutral',c:'a'},
   ],
   history:[
    {p:'2011-2015',d:'<b>Wave of separations.</b> Kraft/Mondelez, Time Warner, Hewlett Packard split. Joel Greenblatt validated.'},
    {p:'2020-2021',d:'<b>Tech bubble era.</b> SOTP discounts compressed. Multi-business tech (Alphabet, Meta) traded at premium.'},
    {p:'2023-2024',d:'<b>Mega-spin era.</b> GE trifecta, Kenvue, Solventum. Mixed outcomes — GE Vernova winning, Kenvue losing.'},
    {p:'2025+',d:'<b>Activist-driven pipeline.</b> Honeywell, Sanofi, Bayer breakup, IAC/Angi. Activists catalyzing structural value.'},
   ]},

  {cat:'REORG',title:'Restructuring (OOC)',icon:'⊜',col:'#9c6d2a',bg:'rgba(245,166,35,.1)',bd:'rgba(245,166,35,.22)',sub:'Exchange · Consent · A&E',
   current:'Active',curCol:'#9c6d2a',curBg:'rgba(245,166,35,.15)',
   curNote:'Maturity wall 2025-27 forcing OOC. Lumen, Altice, DISH/DirecTV active.',
   best:[
    {t:'Maturity walls approaching',d:'Companies forced to refinance or restructure. Telecom, media, retail in 2024-26 cycle. Lumen completed $15B OOC.'},
    {t:'Moderate credit stress',d:'OAS 350-500bps = workable for OOC. Severe stress > 500bps forces full bankruptcy. Sweet spot for OOC.'},
    {t:'Stable but rising rates',d:'A&E (amend-and-extend) effective when rates stabilize. Companies trade higher coupons for runway.'},
    {t:'Stressed but viable sectors',d:'Where operational fix exists (telecom fiber buildout, retail rationalization). Not terminal decline.'},
   ],
   worst:[
    {t:'Severe credit crisis',d:'Liquidity vanishes. No OOC possible — straight to bankruptcy. Funds get stuck with restructuring claims at depressed values.'},
    {t:'Holdout-heavy capital structure',d:'Single 2L holder can block OOC. Forces costly pre-pack or contentious bankruptcy. Drahi/Altice friction example.'},
    {t:'Rapid rate cuts',d:'OOC negotiated at higher rates becomes uncompetitive post-cut. Mark-to-market losses on new securities.'},
    {t:'Terminal sector decline',d:'OOC just delays inevitable. Yellow Corp, Sears — operational decline outpaced restructuring runway.'},
   ],
   exposures:[
    {l:'Rates',v:75,dir:'short',c:'r'},
    {l:'Volatility',v:40,dir:'long',c:'a'},
    {l:'Credit',v:80,dir:'long',c:'r'},
    {l:'Liquidity',v:70,dir:'short',c:'r'},
    {l:'Cycle',v:65,dir:'short',c:'a'},
   ],
   history:[
    {p:'2009-2012',d:'<b>Post-GFC OOC wave.</b> Banks, REITs, retailers. Massive exchange offer volume. Specialists generated 18-22%.'},
    {p:'2015-2016',d:'<b>Energy A&E era.</b> E&P companies pushed maturities. Continental, Whiting, Sandridge avoided bankruptcy via OOC.'},
    {p:'2020',d:'<b>COVID OOCs.</b> Brief surge — airlines, cruise, retail. Government support truncated cycle.'},
    {p:'2024-2026',d:'<b>Telecom/media wave.</b> Lumen $15B done. Altice USA, EchoStar/DISH active. CRE OOCs accelerating.'},
   ]},
];

export const HIST: HistDeal[] = [
  {cat:'MERGER',yr:'1989',nm:'RJR Nabisco LBO',acq:'KKR',v:'$31B',ret:'15%',dur:'4 mo',
   desc:'The defining LBO of the 1980s. Bidding war between KKR, Shearson Lehman (Ross Johnson), and Forstmann Little. Final $109/share. Stock had been $55 pre-rumor. Subject of "Barbarians at the Gate".',
   out:'KKR won at $109/share. Highly leveraged structure (24x debt/EBITDA). Eventually broken up — Nabisco spun off 1999, RJR sold to Japan Tobacco. KKR underperformed S&P over hold period.',
   lesson:'Established mega-LBO playbook AND showed that scale + leverage doesn\'t guarantee returns. Created the modern PE industry.'},
  {cat:'MERGER',yr:'1998',nm:'Daimler-Chrysler',acq:'Daimler-Benz',v:'$36B',ret:'-65%',dur:'9 yr hold',
   desc:'"Merger of equals" between Daimler-Benz and Chrysler — first transatlantic mega-merger. Pitched as global automotive champion. Stock-for-stock deal at $57/share for Chrysler.',
   out:'Cultural integration failed. Chrysler bled cash. Daimler sold Chrysler to Cerberus 2007 for $7.4B (vs $36B paid). One of the most destructive M&A failures in history.',
   lesson:'Cross-border "mergers of equals" are usually acquisitions in disguise. Cultural fit > strategic logic.'},
  {cat:'DISTRESSED',yr:'2009',nm:'General Motors Ch.11',acq:'US Treasury / UAW',v:'$82B',ret:'+450%',dur:'363 days',
   desc:'Largest industrial bankruptcy in US history. GM Old Co → New GM via 363 sale. US Treasury took 60% stake. UAW VEBA trust got 17.5%. Bondholders got 10% + warrants. Old equity wiped.',
   out:'New GM IPO Nov 2010 at $33/share. Treasury exited 2013 at avg $30 (small loss). UAW VEBA monetized stake at huge gain. Bondholders\' equity package: 4-7x recovery vs initial debt prices.',
   lesson:'Government-orchestrated bankruptcies follow different rules. Political stakeholders > absolute priority. Distressed PMs who bought GM bonds at 8 cents made fortunes.'},
  {cat:'DISTRESSED',yr:'2008',nm:'Lehman Brothers',acq:'Barclays / Nomura',v:'$691B assets',ret:'+200%',dur:'12 yr+',
   desc:'Largest bankruptcy ever ($691B assets). Investment bank failed Sep 15 2008. Barclays bought North American broker-dealer. Nomura bought Asia + Europe. Most assets liquidated over 12 years.',
   out:'Senior unsecured creditors recovered 41-45 cents. Junior subordinated bonds: 0-5 cents. Lehman estate generated $115B distributions through 2022. Created modern systemic risk regulation.',
   lesson:'Even "too big to fail" can fail. Distressed PMs who held Lehman senior at 8-15 cents recovered 41-45 cents = 3-5x return. Patience pays in mega-bankruptcies.'},
  {cat:'ACTIVISM',yr:'2007',nm:'TCI vs CSX',acq:'TCI / 3G',v:'$36B cap',ret:'+85%',dur:'2 yr',
   desc:'Children\'s Investment Fund (TCI, Chris Hohn) + 3G Capital launched US activist campaign against rail operator CSX. Demanded board seats, operational changes. Famously aggressive proxy fight.',
   out:'Won 4 board seats June 2008 vote. CSX adopted recommended operational changes. Stock +85% over 2-year campaign window. Foundational European activist crossing into US large-cap.',
   lesson:'Activism scaled internationally. Foreign funds CAN win US proxy fights. CSX became template for transportation activism (CP/CN, NSC).'},
  {cat:'ACTIVISM',yr:'2013',nm:'Carl Icahn vs Apple',acq:'Icahn Enterprises',v:'$500B+ cap',ret:'+85%',dur:'2 yr',
   desc:'Icahn 0.8% stake ($3.6B) demanding $150B buyback. Public Twitter campaign. Met Tim Cook for "cordial dinner". Push for cash return on $150B+ balance sheet.',
   out:'Apple expanded buyback program from $60B to $200B+. Stock +85% over 2-year period. Icahn exited 2016 at ~7x return.',
   lesson:'Activism works even at mega-cap scale. Small stakes can drive massive capital allocation changes. Icahn turned mega-cap activism mainstream.'},
  {cat:'SPINOFF',yr:'2014',nm:'eBay / PayPal',acq:'eBay Spin',v:'$50B',ret:'+45%',dur:'12 mo post',
   desc:'Activist (Carl Icahn) pushed eBay to spin off PayPal. Combined company viewed at SOTP discount. PayPal seen as constrained by eBay relationship. Distribution July 2015 at $36/share.',
   out:'PayPal independence catalyzed M&A integration with new merchants (away from eBay). Stock 2x in 18 months post-spin. eBay also performed well as pure-play marketplace.',
   lesson:'Classic activist-catalyzed spin-off creating two pure-plays from one conglomerate. Each business performed better separately. Template for tech separations.'},
  {cat:'SPINOFF',yr:'2015',nm:'HP / HPE / HPI',acq:'HP Split',v:'$60B combined',ret:'+30% / +50%',dur:'3 yr post',
   desc:'Meg Whitman split HP into HP Inc (printers, PCs) and Hewlett Packard Enterprise (servers, networking, services). November 2015 distribution.',
   out:'HPE further broke itself up: spun Software to Micro Focus (2017), Services to DXC (2017). Both descendants performed materially better than combined HP. Total value unlock estimated at $20B+.',
   lesson:'Demonstrated that "tech conglomerate" model was structurally broken. Cleaner pure-plays + better capital allocation = sustained outperformance.'},
  {cat:'MERGER',yr:'2018',nm:'AT&T / Time Warner',acq:'AT&T',v:'$85B',ret:'-40%',dur:'6 yr',
   desc:'AT&T acquired Time Warner after winning DOJ antitrust trial (vertical merger). $85B mega-deal. Strategic logic: content + distribution. Subsequently spun off WarnerMedia to merge with Discovery (2022) creating Warner Bros Discovery.',
   out:'AT&T stock -50% from announcement to spin. WBD -65% post-merger. Strategic combination unwound at massive value destruction. ~$50B+ shareholder value destroyed.',
   lesson:'Even cleared deals can destroy value. Telecom/media convergence was a multi-trillion dollar mistake industry-wide. Now reverse trend — content companies separating from distribution.'},
  {cat:'MERGER',yr:'2022',nm:'Microsoft / Activision',acq:'Microsoft',v:'$68.7B',ret:'+95%',dur:'21 mo',
   desc:'Largest gaming acquisition ever. Cleared FTC challenge (judge ruled in favor), then CMA in UK initially blocked, requiring restructuring (cloud gaming carve-out). Closed Oct 2023.',
   out:'ATVI shareholders got $95/share cash. Stock $66 pre-announcement. Some periods of deal traded at $75 (10%+ spread on uncertainty). Cleared at full $95 = 44% gain from undisturbed.',
   lesson:'Regulatory uncertainty creates spread opportunities. CMA divergence from EU/US post-Brexit became major dealflow risk factor. Behavioral remedies expanded acceptance.'},
  {cat:'ACTIVISM',yr:'2017',nm:'P&G Proxy Fight (Peltz)',acq:'Trian',v:'$240B cap',ret:'+30%',dur:'18 mo',
   desc:'Nelson Peltz/Trian sought single board seat at P&G. Closest mega-cap proxy fight in history. Initially lost by 0.2% but won recount. Most expensive proxy fight ever (~$100M combined).',
   out:'P&G appointed Peltz to board March 2018. Stock outperformed S&P by 25% over next 24 months. Trian exited 2021. Activist agenda partially implemented.',
   lesson:'Even mega-cap CPG can be activist target. Proxy fights at $200B+ scale viable. Board representation, not just engagement, drove results.'},
  {cat:'REORG',yr:'2014',nm:'Detroit Bankruptcy',acq:'City Restructuring',v:'$18B debt',ret:'Variable',dur:'17 mo',
   desc:'Largest municipal bankruptcy in US history. Detroit filed Chapter 9. Pension obligations vs bondholder claims central conflict. "Grand Bargain" with DIA art collection became precedent.',
   out:'GO bondholders: 74% recovery. Pensions cut 4.5% nominal. DIA art protected. Exit August 2014. Distressed muni specialists generated 60%+ IRR.',
   lesson:'Chapter 9 (municipal bankruptcy) has unique rules. Political + pension dynamics override credit analysis. Created template for Puerto Rico, future muni distress.'},
  {cat:'MERGER',yr:'2000',nm:'AOL / Time Warner',acq:'AOL',v:'$165B',ret:'-90%',dur:'10 yr',
   desc:'Stock-for-stock at peak of dot-com bubble. AOL acquired Time Warner using inflated AOL stock as currency. Created world\'s largest media company on paper.',
   out:'Combined company lost $99B in 2002 alone (largest corporate loss ever). Spun apart 2009. Estimated $200B+ shareholder value destruction. Defines "deal at top of cycle".',
   lesson:'Stock-deal mechanics matter. Acquirers paying with overvalued stock destroyed value at unprecedented scale. Every banker references AOL/TWX as warning.'},
  {cat:'DISTRESSED',yr:'2017',nm:'Toys R Us Liquidation',acq:'Bondholders',v:'$5B debt',ret:'Variable',dur:'9 mo',
   desc:'Iconic PE-backed retail bankruptcy. KKR/Bain/Vornado leveraged buyout 2005 with $6.6B debt. Decade of $400M+ annual interest payments starved investment. Filed Sep 2017.',
   out:'Initial reorganization attempted but failed. Liquidation March 2018 — all US stores closed. Secured creditors got ~70 cents. Unsecured: 5-15 cents. Equity zero. 30,000 jobs lost.',
   lesson:'PE-leveraged retail is structurally fragile. Cannot service legacy debt + invest in digital transformation. Template for Sears, Payless, etc.'},
  {cat:'SPINOFF',yr:'2002',nm:'Kraft / Mondelez',acq:'Altria Spin',v:'$60B',ret:'+85%',dur:'5 yr',
   desc:'Altria (Philip Morris) spun off Kraft Foods to remove tobacco liability from food business. Subsequent split: Kraft → Kraft Foods Group + Mondelez International (2012).',
   out:'Both Kraft Heinz (2015 merger) and Mondelez became standalone large-caps. Total shareholder return from original Kraft +85% over 5 years vs S&P +40%. Validated tobacco-food separation thesis.',
   lesson:'Liability separations can unlock significant value. Tobacco taint discount removed once segregated. Template for opioid (Bayer), litigation (J&J/Kenvue) separations.'},
  {cat:'MERGER',yr:'2024',nm:'Capital One / Discover',acq:'Capital One',v:'$35.3B',ret:'+8%',dur:'15 mo',
   desc:'Bank merger creating third-largest US credit card issuer. Discover\'s payments network strategic asset. Cleared OCC, Fed, DOJ with CRA commitments. Closed May 2025.',
   out:'All-stock at 1.0192 COF/DFS ratio. Spread compressed from 8% to 1% as gates cleared. Textbook bank merger arb — 6.8% annualized return for 15-month hold.',
   lesson:'Modern bank mergers possible despite "too big to fail" rhetoric. Concrete CRA commitments unlock regulatory approval. Set precedent for future bank consolidation.'},
  {cat:'ACTIVISM',yr:'2024',nm:'Elliott / Southwest',acq:'Elliott',v:'$17B cap',ret:'+28%',dur:'5 mo',
   desc:'Elliott 10% stake, threatened proxy fight with 10-director slate. Demanded CEO Bob Jordan removal + operational transformation. Settlement October 2024.',
   out:'CEO replaced. Six new Elliott-nominated directors added. Operating model overhaul: assigned seating, capacity rationalization, red-eye flights. Stock +28% over campaign.',
   lesson:'Fastest mega-cap activism win in recent history (5 months). Operational concreteness of demands + strong proxy advisory backing = quick capitulation. Modern playbook reference.'},
  {cat:'MERGER',yr:'2019',nm:'BMS / Celgene + CVR',acq:'Bristol-Myers Squibb',v:'$74B',ret:'+12%',dur:'14 mo',
   desc:'Pharmaceutical mega-merger with embedded Contingent Value Right. CVR paid $9 contingent on FDA approval of three Celgene pipeline drugs (Ozanimod, Liso-cel, Bb2121) by milestones.',
   out:'Two of three milestones met. CVR partially expired worthless. CVR traded from initial $3 to as low as $0.50 before partial recovery. Sophisticated capital structure arb opportunity.',
   lesson:'CVRs create binary embedded options often mispriced by market. Specialists generated 30%+ IRR on CVR positions. Template for pharma capital structure arb.'},
  {cat:'DISTRESSED',yr:'2020',nm:'Hertz Ch.11 + Equity Squeeze',acq:'Court / Stalking Horse',v:'$24B debt',ret:'Wild',dur:'12 mo',
   desc:'COVID-19 collapsed travel. Hertz filed Ch.11 May 2020. Wild retail-driven equity rally July 2020 ($0.40 → $5+) on speculation of going-concern value. Even SEC intervened.',
   out:'Hertz emerged June 2021 via "rights offering" structure. Old equity received warrants. Retail speculators broadly lost money. Distressed PMs who held bonds at 25 cents recovered 80+ cents.',
   lesson:'Retail flow can temporarily disconnect bankruptcy securities from underlying value. Sophisticated distressed funds harvested both bond gains AND equity speculation. Modern meme distress.'},
  {cat:'SPINOFF',yr:'2024',nm:'GE Trifecta',acq:'GE Separation',v:'$200B+',ret:'+60% (GEV)',dur:'24 mo',
   desc:'GE separated into GE Aerospace, GE Vernova (energy), and GE Healthcare (already spun 2023). Apr 2024 GEV distribution. Wrong-hands selling created initial discount.',
   out:'GEV +60% post-spin as grid demand confirmed. GE Aerospace cleaner pure-play multiple. Total shareholder value creation $150B+ vs combined GE.',
   lesson:'Conglomerates can self-restructure successfully when management committed. GE proved 8-year separation strategy. Template for Honeywell, J&J, Bayer breakups.'},
  {cat:'MERGER',yr:'2015',nm:'Pfizer / Allergan (Failed)',acq:'Pfizer',v:'$160B',ret:'-15%',dur:'5 mo',
   desc:'Largest pharma deal ever — inversion structure (Allergan domiciled in Ireland). Treasury Department rule change April 2016 retroactively killed tax benefits. Deal terminated.',
   out:'Termination announcement collapsed Allergan stock 20%. Pfizer paid $400M breakup fee. Treasury rule changes specifically targeting deal = unprecedented regulatory action.',
   lesson:'Tax-driven inversions can be killed by regulatory action even post-signing. Political risk became a deal risk category. Pharma tax inversion era ended.'},
  {cat:'ACTIVISM',yr:'2024',nm:'Elliott / Honeywell',acq:'Elliott',v:'$145B cap',ret:'Live',dur:'Ongoing',
   desc:'Largest activist position by capital deployed ($5B). Three-way separation demand: Aerospace, Industrial Automation, Buildings. Engagement Nov 2024.',
   out:'HON committed to Aerospace + Automation separation early 2025. Buildings TBD. Stock +18% from disclosure. Largest current activist campaign by deployed capital.',
   lesson:'Mega-cap activism scaling to $5B+ stakes. Elliott\'s industrial conglomerate playbook (Arconic, Cognex, Ashland) reaching ultimate scale. Active situation to monitor.'},
  {cat:'DISTRESSED',yr:'2023',nm:'WeWork Ch.11',acq:'Estate',v:'$8B pre-BK',ret:'Variable',dur:'7 mo',
   desc:'$47B peak valuation → $0 equity in 4 years. Filed Ch.11 Nov 2023. $12B lease obligations eliminated. Emerged June 2024 with 400 locations (from 700) and reduced rent.',
   out:'Equity zero. Senior secured: 65 cents recovery. 2L: 15 cents. SoftBank wrote off $15B investment. Iconic example of unprofitable growth company collapse.',
   lesson:'Lease-heavy growth model fundamentally broken at scale. Even cleaner balance sheet emergence didn\'t restore viability. Cautionary tale for asset-heavy startups.'},
  {cat:'SPINOFF',yr:'2023',nm:'Kenvue (J&J Consumer)',acq:'J&J Spin',v:'$38B cap',ret:'-22%',dur:'18 mo',
   desc:'J&J spun consumer health (Tylenol, Listerine, Neutrogena) via IPO May 2023 + split-off August 2023. Removed Tylenol litigation overhang from J&J pharma.',
   out:'Kenvue at IPO $22 → $17 currently. Consumer staples multiple compression + Tylenol litigation + sunscreen recall headwinds. Underperformed J&J post-separation.',
   lesson:'Not all spin-offs unlock value. SpinCo into deteriorating sector environment = double whammy. Liability separation thesis can backfire if SpinCo standalone is weak.'},
  {cat:'MERGER',yr:'2025',nm:'US Steel / Nippon (Blocked)',acq:'Nippon Steel',v:'$14.9B',ret:'-50% (current)',dur:'18 mo+',
   desc:'$55/share all-cash tender by Japanese acquirer. Blocked by Presidential CFIUS prohibition Jan 2025. National security determination. Litigation ongoing in DC Circuit.',
   out:'USS trading $32 vs $55 offer = 42% spread reflecting binary outcome. Litigation could take 12-18 months. Set precedent for ally-nation acquisitions of US "strategic" industries.',
   lesson:'CFIUS now applies even to close allies (Japan). Political dimension of M&A reached new heights. Binary risk situations require small position sizing.'},
];

