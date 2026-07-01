# Anti-patterns de build Vercel / Next.js

Dernière mise à jour: 2026-06-26

Ce mémo documente les erreurs déjà rencontrées sur CleanMyMap pendant la correction de build Vercel/Next.js, afin d'éviter de les reproduire lors des prochaines passes.

## Objectif

Stabiliser le build avant toute optimisation.

Le réflexe attendu est:

1. lire le log complet;
2. classer l'erreur par famille;
3. corriger en lot;
4. lancer un seul build complet;
5. ne déployer sur Vercel qu'après un build local propre.

## Ce qu'il ne faut pas refaire

- utiliser `next build` comme premier outil de diagnostic;
- relancer un build complet après chaque micro-correction;
- créer manuellement des fichiers internes `.next`;
- mélanger une correction de typage, une refonte de layout et une optimisation de bundler dans le même aller-retour;
- passer des fonctions de composant, des classes ou des références non sérialisables d'un Server Component vers un Client Component;
- masquer une erreur de type avec un cast aveugle quand un garde ou un type intermédiaire suffit.

## Frontières Server / Client

### Règle

Un Client Component doit recevoir uniquement des props sérialisables ou déjà rendues:

- chaînes;
- nombres;
- booléens;
- `null`;
- tableaux et objets simples;
- `ReactNode` déjà construit;
- identifiants ou clés de rendu.

Ne pas passer:

- un composant brut importé depuis le serveur;
- une fonction de rappel issue du serveur;
- un objet complexe non sérialisable;
- un accès qui suppose l'exécution d'un hook serveur dans le client.

### Pattern recommandé

Si une carte ou un panneau client a besoin d'une icône:

- passer un `ReactNode` déjà instancié;
- ou passer une clé sérialisable et reconstruire l'icône côté client;
- éviter de transmettre `LucideIcon` ou une fonction de rendu depuis une page serveur.

Si une page racine mélange chrome global, tracking, bandeau cookies et décor dynamique:

- isoler le chrome dans un composant client dédié;
- garder le root layout aussi simple que possible;
- n'y injecter que le minimum nécessaire au shell global.

## Typage: corriger la forme, pas le symptôme

Quand TypeScript bloque le build:

1. vérifier la forme réelle de la donnée;
2. aligner le type partagé sur cette forme;
3. ajouter un garde de type si l'entrée est incertaine;
4. ne garder `as unknown as ...` que sur la vraie frontière externe.

Exemples utiles:

- `value is string` pour des helpers de texte;
- `isParisArrondissement(...)` pour les valeurs `1..20`;
- un type explicite pour les lignes calculées par un export ou un agrégat;
- un type d'interface simple pour les builders Supabase quand le typage inféré devient trop profond.

## Checks avant build complet

Ordre recommandé:

1. `typecheck`;
2. `lint` sur les fichiers touchés;
3. tests ciblés;
4. build complet unique;
5. correction groupée si le build révèle un nouveau blocage.

## Cas rencontrés sur CleanMyMap

### Root layout dynamique

Le root layout a été allégé en séparant:

- le shell global stable;
- le chrome client;
- le décor non critique;
- le tracking et les bandeaux différés.

But: réduire le travail serveur inutile et éviter que le root layout devienne un point de friction.

### Panneau sponsor / cartes de pilotage

Une erreur de prerender est apparue quand une carte client recevait une icône comme référence de composant plutôt que comme élément déjà rendu.

Correction retenue:

- transporter des `ReactNode` sérialisables;
- construire les icônes côté serveur avant l'envoi au client.

### Métadonnées et arrondissements

Une erreur TypeScript est apparue quand un arrondissement parisien `number` brut était passé à une fonction qui attendait un union littéral.

Correction retenue:

- ajouter un garde de type;
- réutiliser ce garde dans le code métier;
- éviter le cast décoratif.

### Types de conversion communautaire

Un export CSV dépendait de champs `cleanup_*` qui n'étaient pas encore présents dans le type calculé.

Correction retenue:

- synchroniser le type partagé;
- propager les champs au niveau du calcul;
- valider le contrat avant de réexécuter le build.

## Référence associée

- [Triaging a Vercel/Next.js Build](./vercel-next-build-triage.md)
- [Découpage du bundle client et frontière serveur](./client-server-bundle-splitting.md)
- [TypeScript Precision Policy](./typescript-precision-policy.md)

