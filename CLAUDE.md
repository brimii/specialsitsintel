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

- ✅ **Bouton 💰 Enrich missing prices** dans `/admin/review` (server action `reEnrichQueueItems` dans `app/admin/review/actions.ts`) : retro-enrichit en 2 passes — (1) items `review_queue.statut='en_attente'` avec source_url (modifie `proposition.deal` en place) ; (2) `deals` rows avec `valeur` vide/TBD ou `price.o = 0`, lookup source dans `deal_updates._creation`, écrit un audit row `_enrich_price` après update. Lock dédié `reEnrich`. **Lancé en fin de session côté humain — résultats non encore observés.**

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
