# CLAUDE.md — Mémoire de projet : SpecialSitsIntel

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Il décrit le produit, la stack, les règles et la méthode de travail.
> **Tiens-le à jour** : à la fin de chaque phase, mets à jour la section « État d’avancement ».

-----

## 1. Le produit

**SpecialSitsIntel** est un terminal d’intelligence *event-driven* / *special situations* destiné aux fonds d’investissement institutionnels. Il suit en temps réel des situations spéciales (merger arbitrage, activisme actionnarial, dette distressed, spin-offs, restructurations, tender offers) avec scoring IA, suivi réglementaire multi-juridictions, prédiction de calendrier et analytics de portefeuille.

**Positionnement** : « Tout ce que Bloomberg ne fait pas, à une fraction du coût. » Concurrents directs : Reorg / Octus. Notre différenciation repose sur la vitesse de l’IA combinée à une vérification humaine rigoureuse des données.

**Public** : analystes et gérants de fonds event-driven. Accès institutionnel, données fiables et sourcées.

**Point de départ technique** : une maquette existante en un seul fichier HTML (`specialsitsintel_premium_2.html`) avec 8 pages — Home, Deal Universe, My Portfolio, Strategies, Market Regime, Historical, Regulators, Glossary — et 3 modales (Request Access, Contact Sales, Log in). Cette maquette définit le design de référence à conserver fidèlement.

-----

## 2. La règle d’or (NON NÉGOCIABLE)

> **On ne fait JAMAIS confiance au navigateur.**
> Toute décision d’accès — qui voit quel contenu selon son abonnement — se prend **côté serveur** (API routes + Row Level Security dans Postgres).
> Cacher du contenu en CSS ou en JavaScript ne protège rien : n’importe qui peut ouvrir les outils développeur et tout lire.
> **Si une donnée arrive dans le navigateur, considère-la comme publique.**

Corollaires appliqués partout :

- Le filtrage des deals et de leurs champs selon le palier se fait **avant** l’envoi au navigateur.
- Le palier (`tier`) d’un utilisateur n’est mis à jour **que** par le webhook Stripe vérifié côté serveur — jamais depuis le front.
- Toute API route sensible revérifie l’identité et le rôle de l’appelant.

-----

## 3. La stack

|Couche                   |Outil                                              |Rôle                                           |
|-------------------------|---------------------------------------------------|-----------------------------------------------|
|App + hébergement        |**Next.js** (App Router, TypeScript) sur **Vercel**|Front + API routes, déploiement par `git push` |
|Base + comptes + sécurité|**Supabase** (PostgreSQL + Auth + RLS)             |Données, authentification, sécurité par ligne  |
|Paiements / abonnements  |**Stripe** (Checkout + webhooks + Customer Portal) |Souscriptions récurrentes, facturation         |
|Pipeline de données      |**Claude API** (gamme Sonnet) + **Vercel Cron**    |Extraction structurée de l’actualité financière|

Ne pas introduire de nouvelle bibliothèque lourde, de nouveau framework ou de nouvelle palette sans raison explicite. Rester dans cette pile.

-----

## 4. Les paliers d’abonnement

|Palier (`tier`)|Prix                   |Accès                                                                      |
|---------------|-----------------------|---------------------------------------------------------------------------|
|`free`         |0 €                    |5 deals max, spread + proba de close. Pas de commentaire IA ni scoring FTC.|
|`analyst`      |150 €/mois (1 800 €/an)|Tous les deals + scoring IA + NLP FTC + charts + tracker portefeuille.     |
|`institutional`|600 €/mois             |Tout Analyst + API + multi-seat (3) + optimiseur Kelly.                    |
|`enterprise`   |2 500 €/mois           |Tout + white-label + seats illimités + intégrations custom.                |

Hiérarchie d’accès : `free` < `analyst` < `institutional` < `enterprise`. Un utilisateur voit un deal si son `tier` ≥ `min_tier` du deal.

-----

## 5. Schéma de base de données (référence)

Six tables. RLS activée sur **toutes**. Voir le guide pour le SQL complet ; rappel des structures :

- **`profiles`** — `id` (= auth.users), `email`, `nom`, `fund`, `aum`, `tier` (défaut `free`), `role` (défaut `user`, ou `admin`), `created_at`. Un trigger crée automatiquement une ligne à chaque inscription.
- **`subscriptions`** — `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `tier`, `status` (`active`/`past_due`/`canceled`), `current_period_end`.
- **`deals`** — `nom`, `acquereur`, `valeur`, `spread`, `proba_close`, `ev`, `regulateur`, `categorie`, `statut`, `region`, `description`, `ai_commentary`, `min_tier` (défaut `analyst`), `updated_at`.
- **`deal_updates`** — audit trail : `deal_id`, `champ_modifie`, `ancienne_valeur`, `nouvelle_valeur`, `source_url`, `confiance` (0–100), `auteur` (`ia`/`humain`), `created_at`.
- **`sources`** — `nom`, `type` (`sec`/`regulateur`/`news`), `url`, `derniere_verif`.
- **`review_queue`** — `proposition` (jsonb), `source_url`, `confiance`, `statut` (`en_attente`/`approuve`/`rejete`), `created_at`.

-----

## 6. Conventions de code

- **Langue** : tout en anglais (code, commentaires, UI). Produit destiné à un public institutionnel international. Les anciens commentaires en français peuvent rester ; le nouveau code utilise l'anglais.
- **TypeScript** partout, typage explicite des données venant de la base.
- **Composants React** clairs et découpés : `Sidebar`, `KpiBar`, `Ticker`, `DealTable`, `DealDetail`, pages, modales.
- **Données** lues via des **API routes côté serveur**, jamais en exposant la base directement au navigateur pour le contenu restreint.
- **Client Supabase** : bien distinguer le client navigateur (clé `anon`) du client serveur (sessions par cookies ; clé `service_role` strictement serveur).
- **Design** : conserver fidèlement la palette, les polices (DM Mono, Syne, Instrument Serif), les espacements et l’esthétique « terminal » de la maquette.
- **Git** : commits fréquents, messages clairs, après chaque étape qui fonctionne.

-----

## 7. Sécurité (rappels permanents)

- **Aucun secret dans le code.** Clés Stripe, `service_role` Supabase, clé Anthropic → variables d’environnement (`.env.local` en dev, Environment Variables sur Vercel).
- `.env.local` et `node_modules` doivent être dans `.gitignore`. Aucun secret dans l’historique git.
- Une variable préfixée `NEXT_PUBLIC_` est **exposée au navigateur** → n’y mettre jamais un secret. Seule la clé Supabase `anon` (publique, protégée par RLS) peut l’être.
- Webhook Stripe : **vérifier la signature** + traitement **idempotent**.
- Valider toutes les entrées **côté serveur**, ne jamais faire confiance au front.
- Tester les paiements en **mode test** Stripe (cartes fictives) avant tout passage en réel.

-----

## 8. Le pipeline de données (Phase 3) — principes

- **Les sources priment sur l’IA.** L’IA lit des sources, elle ne « sait » rien. Sources publiques uniquement : SEC EDGAR (gratuit), flux RSS des régulateurs (FTC, DOJ, DG COMP, CMA…), communiqués officiels. **Jamais de republication de données sous licence** (Bloomberg, Reuters, Reorg).
- **Validation humaine obligatoire** pour tout changement de statut matériel (closing, blocage, échec). L’IA propose → file `review_queue` → l’humain valide.
- **Garde-fous** : un changement va en `review_queue` si `type_changement` est MAJEUR, OU `confiance` < 85, OU une seule source. Sinon (mineur, haute confiance, sources concordantes) → écriture + trace dans `deal_updates`.
- **Traçabilité** : chaque donnée porte sa `source_url`, son horodatage et son score de confiance. Historique conservé dans `deal_updates`.
- En finance, une donnée fausse est une faute réputationnelle grave. **Ne jamais privilégier la rapidité sur la justesse.**

-----

## 9. Méthode de travail attendue

- **Une phase / un objectif à la fois.** Ne pas anticiper les phases suivantes.
- **Expliquer avant de coder** : pour toute tâche non triviale, décrire le plan/flux en quelques lignes, attendre validation, puis coder par étapes vérifiables.
- **Montrer avant d’enregistrer** les fichiers de configuration sensibles (SQL, env, webhooks).
- Après chaque étape qui marche : proposer un **commit** et signaler s’il faut mettre à jour ce `CLAUDE.md`.
- En cas d’erreur : demander l’erreur brute complète, donner la cause probable en langage simple, la correction minimale, et comment vérifier.
- **À CHAQUE début de session côté humain — RÈGLE STRICTE** : le PREMIER message doit OBLIGATOIREMENT contenir les commandes PowerShell pour lancer le projet localement + l'URL locale à ouvrir dans le navigateur. Si l'utilisateur dit "nouvelle session", "on reprend", "on continue", ou ouvre une fenêtre PowerShell, donner immédiatement le bloc complet — sans attendre qu'il demande. Le **dossier de travail confirmé** côté humain est :
  ```
  C:\Users\loren\Documents\specialsitsintel
  ```
  (il existe aussi un `C:\Users\loren\specialsitsintel` orphelin sur `main` à ignorer / supprimer un jour). Donc le bloc à donner systématiquement en début de session :
  ```
  cd "C:\Users\loren\Documents\specialsitsintel"
  git pull
  npm run dev
  ```
  Puis : `http://localhost:3000/admin/review` (ou `/` selon ce qu'on travaille). La branche active est `claude/create-claude-md-memory-o4d1u`.
- **Backfill historique (Phase 5) = à faire À LA TOUTE FIN.** Tant que des features live / UX ne sont pas finalisées, ne JAMAIS proposer le backfill DG COMP / SEC EDGAR comme prochaine étape principale. Le scaffold est ready (bouton 📚 dans `/admin/review`) — on attend la consigne explicite "on attaque le backfill" avant de lancer.

-----

## 10. Feuille de route (phases)

- **Phase 0 — Socle** : recréer la maquette en composants Next.js ; créer les 6 tables ; migrer les deals du HTML vers la base ; brancher la page Universe sur Supabase.
- **Phase 1 — MVP commercial** : Auth Supabase (inscription/connexion/lien magique) ; Stripe Checkout + webhook ; restriction par palier (RLS + filtrage API).
- **Phase 2 — Gestion** : exploiter les dashboards Supabase + Stripe ; page `/admin` (rôle admin) si besoin.
- **Phase 3 — Pipeline semi-automatique** : Cron + SEC EDGAR + extraction Claude API + `review_queue` + garde-fous.
- **Phase 4 — Automatisation étendue** : publier seuls les changements mineurs à haute confiance ; l’humain garde le matériel.
- **Phase 5 — Backfill historique** : peupler la base avec les deals event-driven passés à partir des sources déjà branchées. Ordre d'attaque prévu (selon rendement décroissant) :
  1. **DG COMP 1990-aujourd'hui** — le JSON Open Data déjà consommé contient **10,232 cases historiques** (~6-8k deals exploitables après dédup). Aucune nouvelle source à brancher, juste retirer le filtre `daysBack` et batcher en plusieurs nuits.
  2. **SEC EDGAR 2001-aujourd'hui** — full-text search remonte à 2001 (S-4 / DEFM14A / SC TO-T / SC 13D / 13E-3 / 8-K). Estimé ~12-20k filings → ~6-10k deals uniques. 2-3 nuits de batch.
  3. **HKEX / ASX / SGX en temps réel** — finir la couverture APAC live AVANT d'attaquer leur historique (déjà difficile car archives plus courtes).
  4. **CMA 2014-aujourd'hui** + archives Competition Commission pré-2014 via webarchive.nationalarchives.gov.uk si on creuse. Estimé ~600-800 cas récents + ~400 pré-2014.
  - **TDnet** : l'archive quotidienne ne remonte qu'à 2-3 ans en URL pattern actuel ; au-delà il faut TDnet Premium (payant) — peu rentable pour le moment.
  - **Coût Claude API estimé** : ~75-150 USD pour ~15-20k extractions avec prompt caching (50 req/min Tier 1 → ~5-7h cumulées de batch nocturne).
  - **Avantage qualité** : les deals passés ont leur outcome connu → on enrichit automatiquement (`statut="Closed"`, `proba_close=100`, `spread=0`) → moins d'hallucinations possibles.

-----

## 11. État d’avancement

> Mets à jour cette section au fil du projet pour que les futures sessions sachent où on en est.

- [x] Phase 0 — Socle (migration vers Next.js + base) ✅
- [x] Phase 1 — Auth + Stripe + restriction par palier ✅
- [x] Phase 2 — Gestion / admin ✅
- [x] Phase 3 — Pipeline de données semi-automatique ✅ (US/EU/APAC live + 2nd-pass enrichment opérationnels)
- [ ] Phase 4 — Automatisation étendue (publication auto des changements mineurs)
- [ ] Phase 5 — Backfill historique (voir feuille de route)

**Session 2026-05-31 — Couverture APAC live + 2e passe + colonne Size** (état à la coupure) :

- ✅ **APAC live = TDnet (Tokyo) + HKEX (Hong Kong)** branchés via `lib/discovery-apac.ts` (orchestrateur `Promise.allSettled`).
  - `lib/sources/tdnet.ts` : scrape les pages d'index quotidiennes `release.tdnet.info/inbs/I_list_001_YYYYMMDD.html` ; regex anchoré sur classes `kjCode`/`kjName`/`kjTitle` ; codes 5 caractères alphanumériques ; pré-filtre Japonais (TOB/MBO/公開買付/株式取得/合併/etc.).
  - `lib/sources/hkex.ts` : appelle le **servlet officiel** `https://www1.hkexnews.hk/search/titleSearchServlet.do` en GET (POST = 405) avec fenêtre `fromDate/toDate` → renvoie `{result: "<JSON array stringifié>"}` avec ~3900 disclosures par semaine ; parse + filtre catégorie HKEX (DISCLOSEABLE / MAJOR / VERY SUBSTANTIAL / SCHEME OF ARRANGEMENT / MANDATORY OFFER…) ; les anciennes URLs `/listedco/listconews/sehk/YYYY/MMDD/index_e.htm` sont TOUTES dépréciées (404).
  - Prompt système APAC enrichi : section dédiée HKEX (5-digit codes, SFC/HKEX/MOFCOM routing) + section Language CRITICAL qui force tout en anglais (translittération Romaji ou nom officiel).

- ✅ **2e passe d'enrichissement (CMA / DG COMP / TDnet / HKEX)** :
  - `lib/pdf.ts` : `fetchPdfText(url)` via `unpdf` (lib pure-JS ESM, sans dépendance native). Cap à 60k chars.
  - `lib/enrich.ts` : `enrichDealFromDocument(deal, docText)` → 2e appel Claude focalisé "prix only" avec garde-fous (NEVER replace known price with 0, NEVER replace `$X.XB` with `TBD`, conversion 億/兆 → English scale). Merge défensif.
  - `lib/discovery-apac.ts` : pour chaque candidat TDnet/HKEX, fetch le PDF via `c.url` (qui EST déjà l'URL du PDF) → enrich → insert.
  - `lib/sources/cma.ts` : nouveau `findCmaCasePdf(caseUrl)` scrape la page case sur gov.uk pour trouver le PDF Decision/Final Report (priorité keywords) → fetch → enrich.
  - `lib/sources/dg-comp.ts` : étendu `DgCompCase.decisionPdfUrl` ; nouveau `pickFirstPdfFromCase` + `deepFindPdfUrl` walkent `decisions / caseAttachments / pressReleases / publications` du JSON Open Data → enrich.
  - `lib/discovery-eu.ts` : branche les 2 enrichissements ; logs `ENRICHED ... :: before → after`.

- ✅ **Bouton 💰 Enrich missing prices** dans `/admin/review` (server action `reEnrichQueueItems` dans `app/admin/review/actions.ts`) : retro-enrichit en 2 passes — (1) items `review_queue.statut='en_attente'` avec source_url (modifie `proposition.deal` en place) ; (2) `deals` rows avec `valeur` vide/TBD ou `price.o = 0`, lookup source dans `deal_updates._creation`, écrit un audit row `_enrich_price` après update. Lock dédié `reEnrich`.
  - **Premier run côté humain** : `candidates queue=0 deals=141 (37 of 141 deals have source_url)` → `DONE :: enriched=3 unchanged=13 skippedNoPdf=21`. Enrichissements réussis (tous TDnet) : **Makiya** `v=TBD pr.o=0 → v=¥4.5B pr.o=1031`, **Axel Mark** `v=TBD pr.o=0 → v=¥900M pr.o=20`, et un deal `nm="TBD"` (call gaspillé). DG COMP map = 3894 cases (confirme la profondeur de la source). 21 skipped = URLs SEC (sautées par design : 1re passe avait full text) ou CMA pages sans PDF Decision/Final Report parseable. 13 unchanged = Claude a vu le doc mais pas trouvé d'info nouvelle (souvent activistes 13D ou notices courtes).
  - **Petits fixes à faire à la prochaine session** : (a) skip les deals avec `nm IN ('TBD','','Unknown')` avant l'enrich (évite les calls gaspillés) ; (b) dédupliquer `deal_updates._creation` quand un même deal apparaît plusieurs fois dans le map source (Gold Resource Corporation est apparu 2× dans les logs).

- ✅ **Colonne "Size" triable** dans la table des deals (`app/components/DealTable.tsx`, position col 2 sur 8) :
  - `app/data/deals.ts` : helpers `dealCapUSD(v)` + `fmtCap(usd)` ; FX statiques pour ~18 devises (USD/EUR/GBP/JPY/CHF/AUD/CAD/CNY/INR/SAR/AED/KRW/HKD/SGD/TWD/BRL/MXN/ZAR/NZD). Parse `$13.9B`, `€11.7B`, `£3.8B`, `¥320B`, `A$9.1B`, `CHF 4.2B`, `$147B cap`, `SAR 12B`, `₹500B` → numeric USD ; "TBD"/null → 0 (tombe au bas du tri descendant). Affichage `$X.XB` / `$XXM` / `—`. Grille CSS étendue à 8 colonnes (3 lignes touchées dans `app/globals.css` : default + medium + small breakpoints).
  - `app/components/DealUniverse.tsx` : nouveau case `"size"` dans le comparateur.

- ✅ **Prompts de prix renforcés (US + EU + APAC)** : section dédiée `# Deal value & price (CRITICAL — do not skip)` ajoutée aux 3 prompts système ; emphase sur extraction systématique de `v` (transaction value / equity value / enterprise value) et `pr.o` (per-share offer) quand la source les dévoile, anti-hallucination préservé.

- ✅ **Phase 5 (backfill historique) enregistrée dans la feuille de route** (section 10 de ce CLAUDE.md). Ordre d'attaque : (1) DG COMP 1990-2026 — 10,232 cases déjà dans le JSON Open Data, ~6-8k deals exploitables ; (2) SEC EDGAR 2001-2026 — ~12-20k filings ; (3) HKEX/ASX/SGX live d'abord ; (4) CMA 2014-2026. Coût estimé Claude API : ~75-150 USD pour ~15-20k extractions avec prompt caching.

**À faire à la prochaine session (ordre suggéré) :**
1. Observer les résultats du bouton 💰 Enrich missing prices lancé en fin de session (logs `[reEnrich][queue] ENRICHED ...` et `[reEnrich][deals] ENRICHED ...`).
2. **ASX (Australie)** : créer `lib/sources/asx.ts` (Market Announcements Atom/RSS), brancher dans `discovery-apac.ts` à côté de TDnet + HKEX.
3. **SGX (Singapour)** : créer `lib/sources/sgx.ts` (SGXNet), même pattern.
4. Quand APAC live est complet → attaquer Phase 5 historique (DG COMP d'abord, batch nocturne).

**Branche en cours** : `claude/create-claude-md-memory-o4d1u`. Dernier commit (24d4105) = "reEnrich: also process approved deals, not just queue items".

---

**Session 2026-06-01 — ASX live + petits fixes reEnrich + ASX 2nd-pass deferred** :

- ✅ **Petits fixes reEnrich** (`app/admin/review/actions.ts`) : skip `nm IN ('TBD','','Unknown')` (compteur `skippedNoName`) ; dédup par `source_url` dans la passe deals (compteur `skippedDupUrl`). Funnel observé : `skippedNoName=1 skippedDupUrl=3` confirme les fixes en place.

- ✅ **ASX (Australie) live = 3e source APAC** (`lib/sources/asx.ts` + branchement dans `discovery-apac.ts`). Plusieurs itérations pour converger :
  - URL pattern : l'endpoint principal qui marche = `https://www.asx.com.au/asx/v2/statistics/prevBusDayAnns.do` (renvoie la veille business day, ~1.2 MB HTML, ~527 disclosures).
  - Autres probes en fallback (weekly endpoint = formulaire de recherche, todayAnns = vide tôt le matin).
  - Détection des pages "no announcements" et "search form sans PDF" pour passer au probe suivant.
  - Regex : anchore sur `<td>CODE</td>` (3-4 chars alphanum) + date `DD/MM/YYYY` + anchor `displayAnnouncement.do?display=pdf&amp;idsId=NNNNNN` ; HTML-decode `&amp;` → `&`.
  - Prompt système APAC enrichi avec section ASX dédiée (Corporations Act Ch 6 bids, Pt 5.1 schemes, BIDDER'S STATEMENT / TARGET'S STATEMENT, ASIC/ACCC/FIRB, 3-letter tickers BHP/CBA/etc.).
  - ~25 mots-clés M&A en pré-filtre (TAKEOVER / SCHEME OF ARRANGEMENT / MANDATORY UNCONDITIONAL CASH OFFER / SUBSTANTIAL HOLDER / etc.).
  - Test live : `parsed 527 rows → keyword-filtered 42 M&A-relevant → 30 envoyés à Claude → 1 inséré (Coking Coal Assets)`. La majorité des "substantial holder" sont des passive funds (BlackRock/Vanguard/State Street/MUFG) correctement classés `NOT_DEAL` par Claude.

- ⚠️ **ASX 2e passe (enrich PDF) NON RÉSOLUE — deferred** : l'URL `displayAnnouncement.do?display=pdf&idsId=N` renvoie une page de **disclaimer "Access to this site"** (HTML 4729 bytes) au lieu d'un PDF. `lib/pdf.ts` détecte maintenant les réponses non-PDF (check `%PDF-` magic) et tente plusieurs follow-ups (embed/iframe/object src, meta refresh, JS redirect, .pdf href). J'ai aussi câblé une POST sur `announcementTerms.do` avec `agree=true&action=Agree` → renvoie `302 + 5 cookies stored`, mais la requête PDF suivante avec ces cookies retombe sur la **même page disclaimer**.
  - **Diagnostic** : ASX utilise probablement un flow "two-step" : (1) GET disclaimer page pour créer la JSESSIONID, (2) POST agrément avec cette même JSESSIONID, (3) GET PDF avec le cookie persistent. Mon flow actuel saute l'étape 1, donc le serveur ne lie pas mon agrément à un cookie réutilisable.
  - **Solution future** (1-2 itérations) : ajouter dans `lib/pdf.ts` un cookie jar partagé qui (a) GET la disclaimer page d'abord pour récupérer la JSESSIONID, (b) POST l'agrément avec ce même cookie, (c) re-fetch le PDF avec le cookie persisté. Ou plus pragmatique : trouver une URL ASX alternative qui sert directement le PDF sans disclaimer.
  - **Impact pratique faible** : la 1re passe ASX insère bien les deals dans la queue, et les titres ASX donnent rarement le prix de toute façon (Schemes/Bidder's Statements oui, mais les autres non). L'humain peut compléter le prix à l'approbation.

- ✅ **Améliorations `lib/pdf.ts`** au passage : check PDF magic number (`%PDF-`) avant unpdf, suivi des URLs embarquées (embed/iframe/object/meta-refresh/JS-redirect/href.pdf), dump diag 1800 chars du body quand aucun match trouvé, Referer + redirect:follow par défaut.

- ✅ **Yamadai enrichi en cours de session** : `[reEnrich][deals] ENRICHED :: Yamadai :: v=TBD pr.o=601 → v=¥667M pr.o=601`. Preuve que la 2e passe rétroactive continue d'améliorer les deals approuvés au fil des runs.

**État de la queue review en fin de session :**
- ~5 candidats TDnet en attente (V-Tex/Kitz, Yamadai, Landix, Sushimasu, TIGEREYE) — certains avec prix enrichis depuis le PDF
- ~3 candidats HKEX en attente (Ritz-Carlton Perth, Extrawell, Oceanking) — sans prix (PDF HKEX rarement disclosé en headline)
- 1 candidat ASX (Coking Coal Assets) — sans prix (disclaimer ASX bloque la 2e passe)
- Le bouton 💰 Enrich missing prices a confirmé que les SEC URLs sont sautées par design (1re passe avait full text), les CMA pages ne contiennent souvent pas de PDF Decision parseable, et DG COMP marche quand le JSON Open Data fournit une URL.

**À faire à la prochaine session (ordre suggéré) :**
1. **SGX (Singapour)** — créer `lib/sources/sgx.ts` (SGXNet), brancher dans `discovery-apac.ts`, étendre le prompt avec section SGX (Securities and Futures Act, MAS regulator, 3-4 char tickers).
2. **ASX 2nd-pass cookie jar** (optionnel, low priority) — flow 3-step pour débloquer le PDF derrière le disclaimer ASX.
3. Quand APAC live est complet (TDnet + HKEX + ASX + SGX) → attaquer **Phase 5 historique** : DG COMP 1990-2026 d'abord (3893 PDFs déjà mappés dans la session, ~6-8k deals exploitables après dédup), batch nocturne avec rate-limiting Claude.
4. Petits nettoyages : (a) supprimer les `Warning: TT: undefined function` et `cMapUrl` warnings d'unpdf qui polluent les logs ; (b) ajouter un compteur `skippedNoName` aussi à la passe queue (actuellement seulement deals).

**Branche en cours** : `claude/create-claude-md-memory-o4d1u`. Dernier commit (87216b1) = "PDF: accept ASX terms before fetching disclosure PDFs".

---

**Session 2026-06-02 — SGX tenté + ASX 2nd-pass résolu** :

- ❌ **SGX (Singapour) — abandonné, nécessite token d'auth** :
  - Créé `lib/sources/sgx.ts` avec 7 probes en cascade (api.sgx.com v1.1/v1.0, api2.sgx.com, sgx.com/api, links.sgx.com, opendata.sgx.com, RSS) — testé sur Origin/Referer/X-Requested-With headers + détection SPA shell + ASP.NET error page.
  - Verdict : `api.sgx.com/v1.1` répond **401 (Unauthorized)** — le SGX SPA bundle un token JWT/API key dans son JS qu'on ne peut pas extraire trivialement sans s'enregistrer sur leur portail développeur. `api2.sgx.com` = 404. `sgx.com/api/*` = catch-all Angular SPA shell (détecté + skip). `links.sgx.com` = ASP.NET legacy qui renvoie "No Record Found" (endpoint réel mais mauvais paramètres).
  - Branchement dans `discovery-apac.ts` quand même fait (4e branche `Promise.allSettled`, type result étendu avec `sgxScanned`, section SGX dans le prompt système avec Takeovers Code / Listing Rules Ch 10 / SIC/MAS/CCCS / tickers D05/U11/Z74/C6L/Y92). Si un jour on obtient un token, le code est prêt — juste à brancher l'auth header.
  - **Couverture APAC live finale : 3/4** — TDnet (Japan) + HKEX (Hong Kong) + ASX (Australia). SGX reste à brancher quand on aura le token.

- ✅ **ASX 2nd-pass (PDF derrière disclaimer) RÉSOLU** :
  - Flow 3-step implémenté dans `lib/pdf.ts` :
    1. **GET** trigger URL `displayAnnouncement.do?display=pdf&idsId=N` → serveur crée JSESSIONID + renvoie HTML disclaimer avec `<form>`
    2. Parser le form : action `announcementTerms.do`, hidden inputs (`pdfURL` notamment), bouton submit affirmatif (préfère "Agree/Accept/Yes" sur "Decline" via regex)
    3. **POST** au form action avec : cookies du seed GET + hidden inputs + submit name/value affirmatif → serveur marque la session "agreed" (status 302 + 2 cookies en plus)
    4. **GET** original URL avec cookies fusionnés (8 cookies total) → serveur sert le vrai PDF
  - Helpers `extractCookies(res)` + `mergeCookies(a, b)` factorisés.
  - **Test live confirmé** : Coking Coal Assets enrichi `v=TBD → v=A$3.1M`.

- ✅ **Nouveaux deals insérés cette session** (8 total via le pipeline live + reEnrich) :
  - 🇯🇵 **P-Sankoshouji** acquise par Sadoshima (TDnet)
  - 🇯🇵 **Mitsui Sumitomo Construction Road** rachetée par Mitsui Sumitomo Construction (TDnet)
  - 🇭🇰 **International Entertainment** enrichi `v=TBD → v=HK$1.6B` (HKEX 2e passe)
  - 🇦🇺 **Qoria** + **Wakeling Automotive / PWR Holdings** (ASX 1re passe)
  - 🇦🇺 **Coking Coal Assets** enrichi rétroactivement `v=TBD → v=A$3.1M` après débloquage ASX 2nd-pass

**État de la couverture pipeline live à la fin de la session** :
| Région | Source | 1re passe | 2e passe (enrich PDF) |
|---|---|---|---|
| 🇺🇸 US | SEC EDGAR | ✅ | N/A (full text 1re passe) |
| 🇬🇧 EU | CMA (gov.uk Atom) | ✅ | ✅ |
| 🇪🇺 EU | DG COMP (Open Data JSON) | ✅ | ✅ (3894 PDFs mappés) |
| 🇯🇵 APAC | TDnet (Tokyo) | ✅ | ✅ |
| 🇭🇰 APAC | HKEX (titleSearchServlet JSON) | ✅ | ✅ |
| 🇦🇺 APAC | ASX (prevBusDayAnns.do) | ✅ | ✅ (3-step disclaimer flow) |
| 🇸🇬 APAC | SGX | ❌ token requis | — |

**À faire à la prochaine session (ordre suggéré) :**
1. **Phase 5 — Backfill historique DG COMP** : le gros prize. 3894 PDFs déjà mappés dans le map cas→pdfUrl ; ~6-8k deals exploitables après dédup. Stratégie : nouveau bouton "Run historical batch" dans `/admin/review` qui boucle sur tous les cases DG COMP (statut closed/cleared/blocked = outcome connu → `proba_close=100`, `spread=0`, `statut="Closed"`). Rate-limit Claude à ~50 req/min Tier 1. Coût estimé ~$30-50.
2. **Phase 5 SEC EDGAR 2001-2026** : ~12-20k filings, ~6-10k deals uniques. 2-3 nuits de batch après DG COMP.
3. **SGX si on obtient un token dev** — sinon classer comme "couverture APAC 3/4, SG marché trop petit pour justifier l'effort d'inscription".
4. Petits nettoyages : (a) supprimer les `Warning: TT: undefined function` et `cMapUrl` d'unpdf qui polluent les logs ; (b) ajouter un compteur `skippedNoName` aussi à la passe queue (actuellement seulement deals).
5. Régler l'horloge Windows (warning `JWT issued at future` sur Supabase) — paramètres Windows → Heure Internet.

**Branche en cours** : `claude/create-claude-md-memory-o4d1u`. Dernier commit (8b729bd) = "PDF: prefer the affirmative ASX submit button".

---

**Session 2026-06-07 — Extraction nm/acq dans 2e passe + chemin local enregistré** :

- ✅ **Préférence "session-start" enregistrée** dans CLAUDE.md (section 9) — surface systématique des commandes PowerShell de lancement + URL locale en début de chaque session. Le **dossier de travail confirmé** côté humain est `C:\Users\loren\Documents\specialsitsintel` (sur la branche `claude/create-claude-md-memory-o4d1u`). Le dossier orphelin `C:\Users\loren\specialsitsintel` (sur `main`, juste l'initial commit) est à supprimer un jour pour éviter la confusion.

- ✅ **Extraction nm/acq dans la 2e passe** (`lib/enrich.ts` + `lib/discovery-apac.ts`) — répare le pain point principal "tonnes de TBD" en queue :
  - **Prompt enrich étendu** avec règles d'extraction `nm`/`acq` + patterns japonais (公開買付者=acquirer, 対象者/対象会社=target, schéma "AによるBの株式取得", MBO SPVs reconnus avec leurs noms "BCJ-XX 株式会社"). Le merge défensif override `nm`/`acq` UNIQUEMENT si la base est `useless` (TBD/empty/Unknown) ET le patch a un vrai nom — jamais remplacer un vrai nom 1ère passe.
  - **EnrichPatch type étendu** avec `nm` + `acq`. Helper `isUselessName(n)` exporté pour réutilisation.
  - **Dedup intelligent dans `discovery-apac`** : DUP_NAME skippé quand 1ère passe → `nm=TBD` (dedup sur "tbd" est non-sens et bloquait des vrais nouveaux deals). Enrich lancé AVANT le dedup, puis re-check DUP_NAME avec le nom corrigé. `existingNames.add(...)` filtre les useless pour ne jamais polluer le set.
  - **Log ENRICHED amélioré** : montre `nm/acq/v/pr.o` before→after au lieu de juste v/pr.o.

- ✅ **Test live confirmé — meilleur run APAC jamais fait** :
  - `[discovery-apac] funnel: scanned=67 candidates=19 inserted=13` (vs 1-2 d'habitude)
  - Extractions remarquables :
    - 🇯🇵 TDnet `TBD / Dual Tap` → **`City Index Hospitality / Dual Tap`** + `v=¥220M`
    - 🇯🇵 TDnet `LINK&M / TBD` → `LINK&M / **Tokio Co., Ltd. and Yuki Co., Ltd.**`
    - 🇭🇰 HKEX `Con Aero Tech / TBD` → **`Con Aero Tech / Mobile Acquisitionco, LLC`** + `v=$535.4M pr.o=0.419`
    - 🇦🇺 ASX `MCE Systems / TBD` → **`MCE Systems / Advanced Innergy Solutions Australia`**
  - Workflow QUEUE MAINTENANCE complet : Enrich (+1 deal V-Tex `pr.o=10375`) → ✅ Approve all clean (**6 inserted** dans `deals` : Ayumi Pharm, G-Genie, City Index, T&D Financial, New Focus, Con Aero Tech) → 7 leftover en queue (v=TBD) pour review manuel.

- ⚠️ **Petits trucs à clarifier au prochain refresh du prompt** (pas urgents) :
  - Claude écrit parfois `acq=N/A` au lieu de `acq=TBD` (vu sur Brainchip Holdings ASX) — le prompt dit TBD, à durcir.
  - `New Focus Auto Tech Holdings / New Focus Auto Tech Holdings` — même nom buyer/seller (la société qui disclose) ; faux positif probable, à filtrer en post-process si récurrent.

**État queue à la fin de session :** 7 candidats avec `v=TBD` (Nippon Dry Chemical, Wiseman, Hakodate Wine, LINK&M, Luk Hing Entertainment, MCE Systems, Brainchip Holdings) — l'humain tranche à la main ou rejette si pas d'info supplémentaire qui arrive.

**À faire à la prochaine session (ordre suggéré) :**
1. **Lancer le 📚 DG COMP backfill pour de vrai** — le scaffold est ready depuis 2026-06-03. Premier clic, observer le 1er run de 300 cases (~6 min, ~$3-5), valider, puis re-cliquer 20-25 fois.
2. **Per-deal source badge dans `DealTable`** — pastille à côté du nom (SEC / CMA / DG COMP / TDnet / HKEX / ASX / Seeded). UX win immédiat sur `/`.
3. **Refresh du prompt enrich** pour fixer le `N/A` au lieu de TBD + détecter le cas "même nom buyer/seller".
4. **Phase 5 SEC EDGAR backfill** : même pattern que DG COMP mais pour les US.

**Branche en cours** : `claude/create-claude-md-memory-o4d1u`. Dernier commit (a7bb5ff) = "CLAUDE.md: record the confirmed local project path".

---

**Session 2026-06-03 — Nettoyage logs + admin UX + Phase 5 scaffold + dashboard + bulk approve + stats strip** :

- ✅ **Logs propres : filtre pdfjs noise** (`lib/pdf.ts`) — helper `silencePdfjsNoise()` swap temporairement `console.log` + `console.warn` pendant l'extraction PDF et bloque 5 patterns bruyants connus (`TT: undefined function`, `loadFont`, `cMapUrl`, `Indexing all PDF objects`, `getHexString`). Vrais warnings préservés. Plus de pollution dans les terminaux dev (10-15 lignes de bruit en moins par enrich).

- ✅ **Bouton 🗑 Reject TBD items** (`actions.ts` + `page.tsx`) — bulk-rejette tous les items `en_attente` dont `proposition.deal.nm` ∈ {TBD, '', Unknown, Unknown target}. Réutilise le predicate `isUseless` de reEnrich. Lock `rejectAllTbd`.

- ✅ **Phase 5 scaffold — bouton 📚 DG COMP backfill (300/click)** (`actions.ts` + `page.tsx`) :
  - Pull les 10k+ cases DG COMP (no date filter), dédup contre `deals.nom` normalisé + `deal_updates.source_url` (idempotent à 100%)
  - Filtre les cases avec `decisionPdfUrl` et non déjà traitées
  - Process 300 cases par clic (~6 min wall clock à 1.2s rate-limit = ~50 req/min Tier 1)
  - Insert direct dans `deals` (skip queue — outcomes connus) avec `statut="Closed"`, `spread=0`, `proba_close=100`, `ev=0`
  - Audit row `_creation` dans `deal_updates` avec source URL → la prochaine run sait quels cases ont déjà été traités
  - Prompt focalisé "historical" qui reconnaît `Cleared` / `Cleared with remedies` / `Blocked` + score G/A/R par niveau de remède
  - Withdrawals / no-jurisdiction findings → `is_deal: false`
  - **Pas lancé ce soir** — scaffolding seulement. Coût estimé total ~$30-50 sur 20-30 clics pour les ~6-8k deals exploitables.

- ✅ **Reorg `/admin/review` toolbar en 4 groupes labellisés** (`page.tsx` + helper `ToolbarGroup`) :
  - **DISCOVER NEW DEALS** : 🇺🇸 US (SEC) / 🇪🇺 EU (CMA + DG COMP) / 🌏 APAC (TDnet + HKEX + ASX)
  - **UPDATE EXISTING DEALS** : ▶ Quick / ▶▶ Full
  - **QUEUE MAINTENANCE** : 💰 Enrich missing prices / ✅ Approve all clean / 🗑 Reject TBD items
  - **HISTORICAL BACKFILL (PHASE 5)** : 📚 DG COMP backfill (style amber pour signaler action lourde)
  - Chaque groupe a un label mono uppercase + une description en hint sous les boutons. Labels longs raccourcis ("🇺🇸 US (SEC EDGAR)" au lieu de "🇺🇸 Discover US deals").

- ✅ **Mini-dashboard `/admin`** (`app/admin/page.tsx`) — 3 nouvelles sections sous les KPIs commerciaux existants :
  - **COVERAGE** : deals par région (US/EU/APAC/Other avec %) + par source (Seeded/SEC/CMA/DG COMP/TDnet/HKEX/ASX, bucketé via URL pattern dans `deal_updates._creation`)
  - **DATA QUALITY** : % avec valeur (`v ≠ TBD`) / % avec offer price (`pr.o > 0`) / Active vs Closed split
  - **PIPELINE ACTIVITY** : queue counts (en_attente / approuve / rejete) + breakdown par source des pending + "Last approved deal" en relatif (`5h ago`, `2d ago`...) avec détail per-source pour repérer une source morte
  - Helpers `DashSection` + `DashCell` qui matchent le look existant `port-kpi`.

- ✅ **Bouton ✅ Approve all clean** (`actions.ts` + `page.tsx`, dans QUEUE MAINTENANCE) — bulk-approuve les `en_attente` qui sont "complets" :
  - `proposition.kind === "new_deal"` (les updates restent manuels — MAJEUR/MINEUR critique)
  - `nm` valide (pas TBD/empty/Unknown)
  - `v ≠ TBD` (a une deal value)
  - `confiance ≥ 75`
  - Même flow que `approveItem` single (insert deals + `_creation` audit + queue status='approuve'), avec `nextId` incrémenté localement après un seul SELECT MAX(id)+1 au début (lock empêche concurrent runs)
  - Compteurs au funnel : `inserted / errors (skipped: noName / noValue / lowConf / updates)`
  - Workflow naturel triade : enrich → approve all clean → reject leftovers.

- ✅ **Stats strip réactive sur `/`** (`DealUniverse.tsx` + composants `StatsStrip`/`StatsCell`) — petite barre mono entre la filter bar et la deal table, qui montre pour les `filtered` deals :
  - `Shown` (count après filtres) · `Active` / `Closed` avec % · `With value` (%) · `With offer price` (%) · `Total cap` (USD normalisé via `dealCapUSD` + `fmtCap`)
  - Recompute reactif sur le même `useMemo(filtered)` — pas de state additionnel
  - `CLOSED_STATUSES = {closed, blocked, dead, terminated, withdrawn}` — tout le reste est actif
  - Cachée si filtered vide.

**État final ce soir :**
| Surface | Avant | Après |
|---|---|---|
| Logs dev | bruit pdfjs tous les enrich | propre, seulement vrais signaux |
| `/admin/review` toolbar | 8 boutons en 1 ligne wrap | 4 groupes empilés labellisés |
| `/admin` overview | 4 KPIs commerciaux | + Coverage / Data quality / Pipeline activity |
| Queue maintenance | manuel item par item | Enrich → Approve clean → Reject TBD (3 bulk actions) |
| `/` deal table | filter bar seule | + stats strip réactive (Total cap incluse) |
| Phase 5 | plan documenté | scaffolding ready-to-click |

**À faire à la prochaine session (ordre suggéré) :**
1. **Lancer le bouton 📚 DG COMP backfill** — observer le 1er run de 300 cases (~6 min, ~$3-5), valider que les inserts se font bien et que la dédup tient. Re-cliquer 20-25 fois pour traiter ~6k deals historiques.
2. **Phase 5 SEC EDGAR 2001-2026** : même pattern que DG COMP backfill mais pour SEC EDGAR full-text search.
3. **Améliorer extraction nom acquéreur TDnet** (option B encore deferred ce soir) : prompt 2e passe pour extraire les deux noms depuis le PDF lui-même, réduit `CANDIDATE TDnet :: X / TBD`.
4. **Per-deal source badge dans `DealTable`** : pastille à côté du nom (SEC / CMA / DG COMP / TDnet / HKEX / ASX / Seeded) pour visibilité immédiate.
5. **SGX si on obtient un token dev** — sinon classer comme "couverture APAC 3/4 acceptée".
6. **Horloge Windows** (warning `JWT issued at future`) — paramètres Windows → Heure Internet.

**Branche en cours** : `claude/create-claude-md-memory-o4d1u`. Dernier commit (ed934ca) = "DealUniverse: inline stats strip below the filter bar".

---

**Session 2026-05-31 — Couverture APAC live + 2e passe + colonne Size** (état à la coupure) :
4. Quand APAC live est complet → attaquer Phase 5 historique (DG COMP d'abord, batch nocturne).

**Branche en cours** : `claude/create-claude-md-memory-o4d1u`. Dernier commit (24d4105) = "reEnrich: also process approved deals, not just queue items".

---

**Session 2026-05-25 / 2026-05-29 — Phase 3 fondation + EU + admin** (archivée) :

- **Phase 3 — Pipeline (fondation faite, attente activation)** : `@anthropic-ai/sdk` ; `lib/anthropic.ts` (client paresseux, model `claude-sonnet-4-6`) ; `lib/sources/sec-edgar.ts` (full-text search + fetch texte) ; `lib/pipeline.ts` (orchestrateur : SEC → extraction Claude JSON via system prompt cacheable → garde-fous **MAJEUR/confiance<85/source unique = review_queue**, sinon = `deals` + `deal_updates`) ; `/api/cron/run` (Bearer `CRON_SECRET`) + `vercel.json` (06:00 UTC) ; `/admin/review` (Approuver / Rejeter + « Lancer maintenant » via server actions). **À activer** : ajouter `ANTHROPIC_API_KEY` et `CRON_SECRET` dans `.env.local`, puis tester via le bouton « Lancer maintenant » dans `/admin/review`. Déploiement Vercel requis pour le Cron quotidien.

- **Phase 2 — Admin (fait)** : `lib/admin.ts` → `requireAdmin()` (404 si rôle ≠ admin). Dossier `app/admin/` : layout avec nav (Vue d'ensemble / Utilisateurs / Deals), page Overview (KPIs users par tier, abos actifs, MRR estimé, deals en base), page Users (changer tier + role via server actions), page Deals (changer `min_tier`). Toutes les mutations re-vérifient le rôle admin et utilisent `service_role` côté serveur. Pour passer admin : `update public.profiles set role='admin' where email='…'` dans le SQL Editor.

- **Phase 1 — Auth (fait)** : email + mot de passe via `@supabase/ssr`. `lib/supabase/client.ts` (navigateur, cookies) + `lib/supabase/server.ts` (`createClient` session + `createAdminClient`) + `proxy.ts` (ex-middleware, rafraîchit la session). Route `app/auth/confirm/route.ts` (confirmation + récupération) + page `app/auth/reset-password`. Modale Login = connexion / inscription / mot de passe oublié. Sidebar = email + déconnexion quand connecté.
- **Phase 1 — Stripe (fait)** : `lib/stripe.ts` (client paresseux + mapping tier↔price) ; `scripts/stripe-setup.ts` (`npm run stripe:setup`) ; migration `0002_stripe.sql` (`profiles.stripe_customer_id` + index unique abo). Routes `app/api/stripe/{checkout,webhook,portal}` : checkout auth serveur ; webhook **signé + idempotent** → met à jour `subscriptions` + `profiles.tier` ; portal. Boutons `CheckoutButton` (Analyst sur Home) + `PortalButton` (sidebar). **Testé** : paiement test → `tier` passe à `analyst`. `.env.local` contient aussi `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`.
- **Phase 1 — Restriction par palier (fait)** : `lib/deals.ts` → `getDealsForTier(tier)` filtre CÔTÉ SERVEUR (free = 5 deals max, `ai`/`desc`/`pr` retirés avant envoi ; payant = tous selon `min_tier`). `page.tsx` est dynamique (`force-dynamic`) et lit le `tier` du profil via la session. `DealUniverse` affiche un bandeau d'aperçu, `DealDetail` masque IA/scoring/graphique en free. `KpiBar` utilise `getAllDeals()` (stats agrégées publiques). Migration `0003_tier_policy.sql` = policy RLS `tier ≥ min_tier` (défense en profondeur, **à exécuter dans le SQL Editor**).
- **À noter** : `min_tier` de tous les deals = `analyst` par défaut → un abonné Analyst+ voit les 213 ; le free voit un aperçu de 5. Pour exposer certains deals au palier free, mettre leur `min_tier = 'free'`.

- **Stack** : Next.js 16 (App Router, TypeScript) sans Tailwind. Maquette de référence conservée dans `reference/specialsitsintel_premium_2.html`. Design system porté tel quel dans `app/globals.css` (tokens + polices DM Mono / Syne / Instrument Serif).
- **Coque** : `Sidebar` (+ nav mobile hamburger/`mob-nav`), `KpiBar` (count/spread/proba **calculés** depuis les deals), `Ticker` dans `app/layout.tsx` (persistants sur toutes les pages).
- **8 routes front faites** : `/` (Deal Universe complet : `DealTable` + `DealDetail` avec graphique SVG `PriceChart`, alert-strip « LIVE INTEL », vue « Upcoming Catalysts », cross-link Strategies), `/home`, `/portfolio` (tracker P&L/Kelly, localStorage), `/strategies`, `/market-regime`, `/historical` (graphiques SVG), `/regulators`, `/glossary`.
- **Modales** : `ModalProvider` + `useModal` + `ModalButton` (Request Access, Contact Sales, Log in) — formulaires + validation + état succès ; reliées depuis Sidebar et Home. Auth réelle en Phase 1.
- **Données** : `app/data/deals.ts` (213 deals + types/helpers) ; `app/data/content.ts` (STRATS/REGS/GLOS/CUR_REGIME/MACRO/REGIMES/HIST/ALERTS/CATALYSTS).
- **Supabase ACTIVÉ** : `supabase/migrations/0001_init.sql` (6 tables + RLS + trigger profil + **GRANTs** de rôles) exécuté ; projet créé ; `.env.local` rempli (URL + anon + service_role) ; `scripts/seed-deals.ts` (`npm run seed`) → **213 deals chargés**. `lib/supabase/server.ts` (client `service_role`) + `lib/deals.ts` (`getDeals()` lit Supabase, fallback local si pas d'env). `page.tsx` (Universe) = Server Component qui lit côté serveur → **lit désormais la vraie base**.
  - *Piège rencontré* : `42501 permission denied for table deals` → corrigé par les `GRANT` ajoutés à la migration (la RLS reste le garde-fou des lignes).
- **Reste (hors Phase 0)** : seul *nice-to-have* non porté = chart plein écran (zoom). Pour la prod, prévoir `export const dynamic` sur `/` quand le filtrage par palier par utilisateur arrivera (Phase 1).
- **Validé en local** (Windows, Node 24) : `npm install` + `npm run dev` → `http://localhost:3000`. Supabase activé côté humain.
- **Branche de dev** : `claude/create-claude-md-memory-o4d1u`. Vérifs faites à chaque étape : `tsc --noEmit`, `npm run lint`, `npm run build`, rendu HTTP. ⚠️ Conteneur headless : aucun contrôle visuel pixel-près ni interaction réelle — à confirmer en local.
