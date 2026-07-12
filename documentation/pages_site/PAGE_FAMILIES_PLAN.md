# Plan — Registre `page-families`

## Statut

```txt
Actif — fondations en place, alignement incomplet
```

## But

Stabiliser pour chaque route :

```txt
famille
fond
hero
cartes
exceptions
documentation
tests
```

Une même information ne doit pas être recalculée indépendamment dans le runtime et la documentation.

## Sources de vérité

| Rôle | Chemin |
|---|---|
| registre des familles | `apps/web/src/lib/ui/page-families/families/registry.ts` |
| manifeste partagé | `apps/web/src/lib/ui/page-families/page-families.manifest.json` |
| resolver pathname → famille | `apps/web/src/lib/ui/page-families/resolve-page-family.ts` |
| exceptions | `apps/web/src/lib/ui/page-families/exceptions.ts` |
| tests | `apps/web/src/lib/ui/page-families/resolve-page-family.test.ts` |
| index documentaire | `documentation/pages_site/INDEX.md` |
| mémoire de non-régression | `documentation/pages_site/PAGE_FAMILIES_NON_REGRESSION.md` |

## Taxonomie documentaire

| # | Famille |
|---|---|
| 00 | Homepage |
| 01 | Accueil & Pilotage |
| 02 | Agir |
| 03 | Cartographie & Impact |
| 04 | Réseau & Discussions |
| 05 | Apprendre |
| 06 | Auth & Onboarding |
| 07 | Institutionnel & Légal |
| 08 | Système & Utilitaires |
| 09 | Admin & Super-admin |
| 10 | Print & Export |

## État réel

### Fait

- registre `page-families` ;
- manifeste partagé ;
- resolver central ;
- exceptions nommées ;
- `VibrantBackground` branché sur le resolver ;
- tokens hero ;
- tokens cartes ;
- test unitaire du resolver ;
- test manifeste / runtime ;
- exception `/explorer` ;
- exception `/methodologie` ;
- exception `/sections/weather` ;
- exception `/sections/rejoindre-un-formulaire` ;
- variante red pour reports / gamification.

### Corrigé dans ce lot

- mapping des sections documentées vers leur vraie famille ;
- test de non-régression de ces mappings ;
- suppression de la fausse couleur rouge de Méthodologie dans la doc ;
- réalignement Communauté vers pink ;
- générateur `pages_site` rendu non destructif ;
- ajout d'un audit route ↔ documentation.

### À arbitrer

```txt
/sections/recycling
/sections/compost
/sections/climate
```

Leur famille produit n'est pas décidée.

Ne pas les déplacer ou les mapper arbitrairement.

## Familles de sections attendues

### Accueil & Pilotage

```txt
/sections/elus
```

### Agir

```txt
/sections/route
/sections/weather
/sections/rejoindre-un-formulaire
```

### Cartographie & Impact

```txt
/sections/gamification
```

### Réseau & Discussions

```txt
/sections/community
/sections/feedback
/sections/actors
/sections/annuaire
/sections/messagerie
/sections/open-data
/sections/funding
/sections/trash-spotter
```

## Exceptions nommées

| ID | Route | Résultat |
|---|---|---|
| `explorer-sommaire` | `/explorer` | famille jaune dédiée |
| `methodologie-impact` | `/methodologie` | Cartographie & Impact, variante sky actuelle |
| `weather-operations` | `/sections/weather` | Agir |
| `join-group-form` | `/sections/rejoindre-un-formulaire` | Agir |
| `reports-impact` | `/reports`, `/gamification`, `/sections/gamification` | variante red |
| `partners-indigo` | `/partners/*` | variante réseau partenaires |
| `error-429` | `/error/429` | état système dédié |

## Critères de fin par route

Une route est considérée alignée quand :

1. sa famille est correcte ;
2. son accès est documenté correctement ;
3. son fond passe par le resolver ;
4. son hero utilise la famille ou une exception explicite ;
5. aucun gradient de bloc n'est réintroduit sans justification ;
6. la fiche `pages_site` correspond au runtime ;
7. le test couvre la route si elle est structurante.

## Gouvernance

### Audit de dérive

```bash
npm run audit:pages-site-drift
```

### Mode strict

```bash
npm run check:pages-site-drift
```

### Règle

Ne pas remettre l'ancien générateur en écriture automatique.

Il ne doit jamais écraser silencieusement :

```txt
INDEX.md
README enrichis
présentations détaillées
propositions
mémoires d'idées écartées
captures
```

## Travail restant

### P0

- intégrer le check de dérive localement ;
- exécuter l'audit ;
- corriger les éventuelles routes encore absentes.

### P1

- arbitrer `recycling`, `compost`, `climate` ;
- ajouter leur mapping et leur documentation après décision ;
- vérifier les cartes métier hors `FamilyRubriqueCard`.

### P2

- décider si des tokens `panel`, `kpi` ou `stat` sont nécessaires ;
- réduire les couleurs codées en dur uniquement lorsqu'un gain réel est démontré.

## Définition de terminé

Le plan peut être clôturé uniquement si :

```txt
[ ] aucune route UI connue n'est absente de l'index
[ ] aucune section finalisée n'est absente de l'index
[ ] chaque route documentée résout vers la bonne famille
[ ] chaque exception est testée
[ ] aucune fiche couleur ne contredit le runtime
[ ] le générateur ne peut plus écraser les docs
[ ] les 3 sections non classées ont reçu une décision explicite
```
