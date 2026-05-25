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

