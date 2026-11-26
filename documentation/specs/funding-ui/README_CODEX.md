# Page de soutien : contribution et transparence

**VALIDATED / RÉCEPTIONNÉ (lot `08/23 | FUND`)**. Intégré sur `main` (`b5080efbf7f186ecad32a5fdf24b5e7ef113e2c4` et correctif final de réception). Les deux fichiers patches candidats (`01-financement-transparence.patch`, `02-contrats-documentaires.patch`) ont été intégrés et retirés.

## Fichiers livrés et sources runtime

- `apps/web/src/components/sections/rubriques/funding-section.tsx` : refonte sobre préservant `CmmCard tone="family"`, CTA unique OnParticipe conditionné à `FUNDING_ONPARTICIPE_URL` avec repli `/contact`, séparation des besoins et des agrégats Stripe cumulés (`updatedAt`), alternatives non financières et mentions d'indépendance.
- `apps/web/src/components/sections/rubriques/use-funding-public-summary.ts` et `apps/web/src/lib/funding/public-aggregate.ts` : parsing strict (`0,00 €` distinct de l'absence, horodatage `updatedAt` depuis `updated_at` sans date inventée) et vérification des retours historiques Stripe.
- `apps/web/src/app/api/funding/aggregate/route.ts` : sélection de `category, net_amount_cents, currency, updated_at` avec échec fermé `503` sur données manquantes ou invalides.
- `e2e/funding-transparency.spec.ts`, `playwright.config.ts`, `scripts/ci/e2e-project-catalog.mjs` : test E2E rattaché au projet `"local public"` avec sélection automatique pour le domaine financement.
- `documentation/pages_site/routes/04-reseau-discussions/funding/funding-README.md` et `funding-presentation-detaillee.md` : contrats route `CURRENT` alignés.

## Décisions et périmètre

Le parcours actuel retenu reste OnParticipe, configuré par FUNDING_ONPARTICIPE_URL. Une seule cagnotte commune, aucune sélection d'affectation, aucun montant ni identifiant transmis. Si la configuration manque, afficher l'indisponibilité et proposer le contact ; ne jamais substituer Stripe ni coder en dur l'URL documentaire. La campagne documentée n'a pas pu être vérifiée en direct ; ni configuration de production ni disponibilité du fournisseur ne sont établies.

Les besoins terrain et fonctionnement sont des usages possibles, pas un bilan comptable. Les agrégats Stripe ne représentent que les paiements confirmés moins les remboursements enregistrés, sans déduction des frais ou dépenses, hors OnParticipe. Le contrat existant attend les deux lignes EUR initialisées par migration. Corriger le défaut constaté : l'ancienne route initialisait les deux catégories à zéro et normalisait aussi des données invalides en zéro. Toute ligne manquante, montant invalide, doublon, devise incorrecte ou somme non sûre provoque 503. Conserver la forme de succès, la limitation de débit et la projection sans identité. Aucun schéma, RPC, webhook, table ou mode de paiement nouveau.

Le retour URL success n'est pas une preuve de paiement ; vérifier le statut existant et distinguer attente, indisponibilité, paiement, remboursement partiel et intégral. Un retour cancelled ne démontre pas l'état comptable de la session. Ne pas demander de vrai paiement pour tester.

Le développement bénévole, les contributions matérielles et la coopération restent distincts des flux financiers. Pas de promesse d'avantage fiscal, de statut associatif, de rémunération, de contrepartie ni d'influence éditoriale. Aucun objectif chiffré ni taux d'avancement artificiel.

## Intégration et preuves

Reprendre le checkout courant en préservant les autres writers, appliquer les patches selon leurs contextes et les contrats actuels. Lire les docs Next locales et appliquer les conventions de formatage, design system, accessibilité et tests. Vérifier le renderer, les autres surfaces de financement et les ancres éventuelles. Tester le modèle (zéro explicite, inconnues, invalides, précision et remboursements), la route publique et les tests existants, typecheck/lint, les deux langues, navigateur desktop/mobile et états de chargement, erreurs/retry, URL success forgée, retour historique remboursé, un seul CTA lorsque configuré, alternative contact quand absent et absence de déclenchement Checkout. Les E2E candidats utilisent des fixtures, pas de transaction réelle. Vérifier un GET public réel sans collecte de données personnelles ni initiation d'un paiement ; ne pas conclure sur l'état de production depuis les mocks.

Une transparence comptable complète nécessite des données vérifiées supplémentaires : recettes encaissées par canal, remboursements, frais, dépenses avec justificatifs anonymisés, période et date d'arrêté, apports en nature et bénévolat séparés. Ne pas introduire un registre fictif, copier les scénarios internes de business-model.md comme budget établi ni créer une nouvelle collecte. Proposer ultérieurement un registre financier public minimisé dérivé des sources comptables réelles et des règles de publication, après preuve du besoin. Le portage juridique et les options HelloAsso/Stripe restent régis par la stratégie canonique.

**Preuves de réception :**
- Vitest ciblé (`public-aggregate.test.ts`, `funding-section.test.tsx`, `aggregate/route.test.ts`, `config.test.ts`, `french-copy-accents.test.ts`) : PASS.
- `select-e2e-sql-plan.test.mjs` + sélection automatique domaine financement (`e2e-project-catalog.mjs`) : PASS.
- `typecheck`, `eslint` ciblé, `check:surfaces`, `check:doc-governance` : PASS.
- Playwright `e2e/funding-transparency.spec.ts` (avec et sans `FUNDING_ONPARTICIPE_URL`) + requête GET réelle sur `/api/funding/aggregate` : vérifiés sur le candidat corrigé.

**STOP CONDITION :** page sobre et opérationnelle, besoins et recettes distincts, transparence temporelle exacte (`updatedAt` et caractère cumulatif sans période comptable inventée), CTA OnParticipe unique conditionné à la configuration, recours au contact si absent, sélection E2E rattachée, validations obligatoires et documentation `CURRENT` alignées, publication sûre.
