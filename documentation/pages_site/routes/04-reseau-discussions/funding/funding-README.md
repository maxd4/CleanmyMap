# Soutenir CleanMyMap

## Fiche canonique

- **Route** : `/sections/funding`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/funding-section.tsx`
  - `apps/web/src/app/api/funding/checkout/route.ts`
  - `apps/web/src/app/api/funding/aggregate/route.ts`
  - `apps/web/src/app/api/funding/checkout-status/route.ts`
  - `apps/web/src/app/api/stripe/webhook/route.ts`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; la présentation du modèle économique est consultable sans compte. Les éventuels parcours partenaire ou de financement restent séparés et conservent leurs propres contrôles.
- **Objectif utilisateur principal** : Comprendre les deux affectations de soutien du projet et la séparation entre contributions, transparence et indépendance de la modération.
- **Action principale attendue** : Choisir une catégorie et un montant puis rejoindre Checkout Stripe.
- **Palette attendue** : rose / pink / fuchsia sur fond réseau sombre
- **Scope** : page publique de soutien avec deux catégories, agrégats nets confirmés par webhook Stripe, Checkout et garanties d'indépendance ; aucun objectif n'est affiché sans source canonique.
- **Terminée** : oui
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : maintenance courante — la page dépend de Stripe et de la migration funding service-only.

## États à documenter

- **loading** : les totaux affichent `Chargement…` pendant la lecture de l'agrégat public.
- **error** : les totaux indiquent leur indisponibilité et proposent une nouvelle tentative ; les CTA sont désactivés pendant cette erreur.
- **redirecting** : le CTA affiche `Redirection vers Stripe…` jusqu'à la navigation Checkout.
- **cancelled** : retour Stripe affiché comme paiement annulé, sans montant confirmé.
- **success** : retour affiché comme `Paiement reçu par Stripe · confirmation en cours` jusqu'à confirmation backend du webhook.
- **access refused** : non applicable à cette présentation publique.
- **Architecture commune** : `SectionShell`/`PageHeader`, `CmmCard` et `CmmButton` ; famille Réseau & Discussions.
- **Variantes** : français/anglais, mobile/desktop, deux catégories `equipment` et `development`.
- **Règle** : le financement n'accorde aucun pouvoir de modération ; les montants publics proviennent des paiements Stripe confirmés moins les remboursements enregistrés, sans PII.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Compléter après alignement visuel et métier.

## Fichiers associés

- [Présentation détaillée](./funding-presentation-detaillee.md)
- [Liste des propositions à traiter](./funding-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./funding-objectifs-non-pertinents.md)
