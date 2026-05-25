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

- **Langue** : code et noms techniques en anglais ; commentaires et UI en français.
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

-----

## 11. État d’avancement

> Mets à jour cette section au fil du projet pour que les futures sessions sachent où on en est.

- [x] Phase 0 — Socle (migration vers Next.js + base) ✅
- [ ] Phase 1 — Auth + Stripe + restriction par palier
- [ ] Phase 2 — Gestion / admin
- [ ] Phase 3 — Pipeline de données semi-automatique
- [ ] Phase 4 — Automatisation étendue

**Session actuelle / notes** (maj 2026-05-25) — *Phase 0 TERMINÉE ✅ (front + Supabase activé). Prochaine : Phase 1.* :

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
