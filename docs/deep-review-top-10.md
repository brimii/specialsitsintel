# Deep review — Top 10 biggest deals in the v2 seed

**Author's knowledge cutoff:** Jan 2026
**User's current time:** Nov 2026
**Gap:** ~10 months during which deal statuses can materially change
**Web verification:** Not possible from the cloud container (proxy blocks SEC EDGAR, Reuters, Yahoo Finance, WSJ, FT, Bloomberg, and IR pages — every external financial host returns 403 at the connect-tunnel layer).

**Format for each deal:**
- Status confidence (HIGH / MEDIUM / LOW) as of Nov 2026
- What's known at the author's cutoff
- What likely moved
- Specific fields to verify / update after running migration 0006

---

## 1. Hess / Chevron — $53B
### Confidence: **MEDIUM-HIGH that it closed**
- **Known (Jan 2026):** ICC Guyana ROFR arbitration ruled in Chevron's favor May 2025. Deal cleared antitrust in 2024. Original close target: H1 2026.
- **Likely by Nov 2026:** Closing occurred Jun-Aug 2026.
- **Action for user:**
  - If closed: UPDATE status='Closed', closing_probability=100, verdict_date={actual close date}, expected_close=verdict_date
  - Short_desc/commentary need rewrite to past tense
  - Current_price should equal offer_total_per_share (all-stock mechanics settled)

## 2. 7-Eleven (Seven & i) / Couche-Tard — $47B
### Confidence: **LOW — highly uncertain**
- **Known (Jan 2026):** Unsolicited approach Aug 2024 at ¥2,250/share, raised Oct 2024 to ~$18.19 ADR equivalent. Seven & i founding family exploring MBO alternative throughout 2025. Japanese FEFTA strategic-asset designation invoked.
- **Possible by Nov 2026:**
  - (a) MBO succeeded — Seven & i taken private by founding family
  - (b) Couche-Tard raised again and board recommended
  - (c) Rejected and situation closed as non-deal
  - (d) Still in review
- **Action for user:** **MUST VERIFY MANUALLY** — this is the single most time-sensitive row in the seed. If outcome (a) or (c), delete the row or set status='Withdrawn'. If (b), update offer price and status.

## 3. ANSYS / Synopsys — $35B
### Confidence: **HIGH that it closed**
- **Known (Jan 2026):** FTC consent Nov 2024, EU cleared May 2025, UK CMA Phase I. China SAMR expected H2 2025.
- **Likely by Nov 2026:** **Closed**, probably Q3-Q4 2025 or Q1 2026.
- **Action for user:** UPDATE status='Closed', closing_probability=100, verdict_date=close date. Commentary rewrite to past tense: "Synopsys completed its $35B acquisition of ANSYS in [month] 2025, delivering [X]% to arb desks."

## 4. US Steel / Nippon Steel — $14.9B
### Confidence: **LOW — major ruling likely but direction unknown**
- **Known (Jan 2026):** Blocked by Biden CFIUS Jan 2025. DC Circuit appeal filed. Oral arguments scheduled April 2026 (per my commentary). Trump admin signals unclear.
- **Possible by Nov 2026:**
  - (a) DC Circuit ruled in favor of Nippon — deal proceeds, status → 'Review' or 'Cleared'
  - (b) DC Circuit upheld block — deal dead, status → 'Blocked'
  - (c) Negotiated resolution — different structure (JV, minority stake, etc.)
  - (d) Still pending ruling
- **Action for user:** **MUST VERIFY MANUALLY**. The current_price I seeded at $42 implies ~55% probability of reversal; this may now be wildly off. Check latest US Steel (X) stock price vs $55 offer.

## 5. Interpublic / Omnicom — $13.25B
### Confidence: **MEDIUM — likely closed, could still be pending**
- **Known (Jan 2026):** Announced Dec 2024 as all-stock at 0.344 OMC per IPG. EU Phase II opened.
- **Possible by Nov 2026:**
  - Expected close window per my commentary was Nov 2026 - Jan 2027
  - Could have closed Q4 2026 or still in final mechanics
- **Action for user:** Check IPG stock — if trading near implied ratio × OMC current price, deal is closing. If widely off, there was a block or restructuring. Likely needs minor commentary update.

## 6. Walgreens Boots Alliance / Sycamore Partners — $10B
### Confidence: **HIGH that it closed**
- **Known (Jan 2026):** Announced March 2025 at $11.45/share take-private. FTC with pharmacy divestitures was the main gate.
- **Likely by Nov 2026:** **Closed**, probably H2 2025 or early 2026. WBA likely delisted.
- **Action for user:** UPDATE status='Closed', closing_probability=100, verdict_date=close date. Commentary rewrite to past tense. If WBA is delisted, may want to mark the deal for archival.

## 7. Cerevel Therapeutics / AbbVie — $8.7B
### Confidence: **CERTAIN — closed August 2024**
- **Known:** Closed at $45 per share August 1, 2024. Historical.
- **Action for user:** Row is already correctly marked status='Closed', closing_probability=100. Commentary correctly describes past completion. **No action needed** — this row is accurate.

## 8. Smartsheet / Vista Equity + Blackstone — $8.4B
### Confidence: **HIGH that it closed**
- **Known (Jan 2026):** Announced September 2024 at $56.50/share. HSR Second Request cleared in Q4 2025.
- **Likely by Nov 2026:** **Closed**. My seed says Jan 22, 2026. User should verify exact date.
- **Action for user:** Row is marked status='Closed' with verdict_date 2026-01-22. **Verify the actual close date** — if different, adjust verdict_date.

## 9. Informatica / Salesforce — $8B
### Confidence: **LOW — uncertain announcement date and status**
- **Known (Jan 2026):** Salesforce had been in talks with Informatica since early 2024 (reports in April 2024 suggesting a deal, then no deal, then revived talks).
- **Actual announcement timing:** My seed says 2026-04-22 which is likely WRONG — the actual announce was May 2025 when Salesforce announced the $8B tender at $25/share (not $37 as my seed says).
- **Important:** The $37/share figure may be wrong. Salesforce reportedly agreed to $25/share which would price the deal ~$8B. My offer_total_per_share needs verification.
- **Action for user:** **MUST VERIFY** announce_date, offer_total_per_share, and current status. If $25 is the right offer price, update the pricing. Deal likely in late regulatory phase or closed by Nov 2026.

## 10. ChampionX / SLB — $7.76B
### Confidence: **HIGH that it closed**
- **Known (Jan 2026):** Announced April 2024 at 0.735 SLB per CHX. DOJ cleared with production-chemicals divestitures. UK CMA cleared April 2026 (my commentary).
- **Likely by Nov 2026:** **Closed**, probably mid-2026.
- **Action for user:** UPDATE status='Closed', closing_probability=100, verdict_date=close date.

---

## Summary table — confidence and required action

| # | Deal | Confidence of Nov-26 status | Primary action required |
|---|---|---|---|
| 1 | Hess / Chevron | MED-HIGH closed | Update to Closed + rewrite commentary |
| 2 | 7-Eleven / Couche-Tard | **LOW** | **Full manual verify — may be withdrawn, MBO'd, or still active** |
| 3 | ANSYS / Synopsys | HIGH closed | Update to Closed + rewrite commentary |
| 4 | US Steel / Nippon | **LOW** | **Verify DC Circuit ruling + stock price** |
| 5 | Interpublic / Omnicom | MED likely closed | Verify EU Phase II outcome |
| 6 | Walgreens / Sycamore | HIGH closed | Update to Closed + rewrite commentary |
| 7 | Cerevel / AbbVie | CERTAIN closed | ✅ Row accurate as seeded |
| 8 | Smartsheet / Vista | HIGH closed | Verify close date (seed says 2026-01-22) |
| 9 | Informatica / Salesforce | **LOW** | **Verify offer price — may be $25 not $37, announce date wrong in seed** |
| 10 | ChampionX / SLB | HIGH closed | Update to Closed + rewrite commentary |

**Triage:**
- **High-confidence closed (6 rows):** #1, #3, #6, #7, #8, #10 — bulk mark as Closed, regenerate commentary via Claude button once in prod with live current_price = offer_total_per_share
- **Need manual verify (3 rows):** #2 (7-Eleven), #4 (US Steel), #9 (Informatica) — these are the time-sensitive / high-uncertainty rows
- **Low-stakes verify (1 row):** #5 (Interpublic) — likely moved favorably or closed

## Workflow recommended after running 0005 + 0006

1. Open `/admin/deals` and sort by `transaction_value_usd` desc to see the top 10
2. Click each row to verify:
   - Does the status still match reality?
   - Does the offer_total_per_share match what shareholders actually get?
   - Is the counterparty still the same (no competing bid intervened)?
3. For the 6 high-confidence closes:
   - Change status → 'Closed'
   - Set closing_probability = 100
   - Set verdict_date = actual close date
   - Set current_price = offer_total_per_share
   - Click "Generate with Claude" to rewrite commentary to past tense
4. For the 3 high-uncertainty (7-Eleven, US Steel, Informatica):
   - Do a quick web lookup (public news on your end, 5 min each)
   - Update status, pricing, commentary accordingly
5. Final sanity check: use the `/` deal universe view to confirm the 30 rows render correctly with their current_price + status + category.

**If you want me to update the seed SQL** with the 6 high-confidence closes marked as Closed (without touching the uncertain 4), say the word and I'll push a migration 0007 that converts them in one shot before you run 0006.
