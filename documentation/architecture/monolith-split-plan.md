# Radar de modularisation

Ce document est un snapshot du dépôt. Il décrit uniquement l’arbre Git
identifié par `RADAR_REF`; le statut `CURRENT` signifie que ce snapshot a été
généré depuis la ref annoncée, pas qu’un ancien SHA reste courant par nature.

RADAR_REF=9a1b87f7879635d4baf7b27c12b953ae31409618
RADAR_GENERATED_AT=2026-09-15T04:36:56.216+02:00
RADAR_STATUS=CURRENT

## Politique et mesure

Le radar utilise le même moteur de mesure que `check-top-heavy-files.mjs` :
fichiers `.ts` et `.tsx` suivis sous `apps/web/src`, octets des blobs Git et
nombre de lignes mesuré sur le contenu exact de la ref.

- `REVIEW_THRESHOLD`: `>500` lignes ou `>40 KiB` — signal d’audit uniquement.
- `HARD_THRESHOLD`: `>1000` lignes ou `>50 KiB` — nouveau dépassement bloquant.
- Baseline: `scripts/checks/heavy-files-baseline.json`, version `1`, actuellement
  vide (`allowed: []`). Il n’existe donc aucune exception ratifiée sur cette
  ref.

Commande de mesure utilisée :

```text
node scripts/checks/check-top-heavy-files.mjs --ref=9a1b87f7879635d4baf7b27c12b953ae31409618 --top=25 --enforce
```

Mesures de la ref : `2236` fichiers mesurés, `90` en `REVIEW_REQUIRED`, `0` en
`HARD_LIMIT`. Le maximum est de `997` lignes et `34095` octets. La taille est
un signal ; la décision architecturale dépend de la cohésion, des
responsabilités, du couplage, de la testabilité et des contrats.

Le type informatif est `runtime`, `test`, `data/config` ou `generated`. Il ne
modifie pas les seuils.

## Vérification des façades modularisées

Les façades modularisées lors des lots précédents ne dépassent plus le seuil
de revue sur cette ref et ne figurent donc plus dans le radar des fichiers à
auditer :

| PATH | LINES | BYTES | KIND |
| --- | ---: | ---: | --- |
| `apps/web/src/app/api/actions/[actionId]/route.ts` | 277 | 8189 | runtime |
| `apps/web/src/lib/actions/store.ts` | 24 | 496 | runtime |
| `apps/web/src/lib/actions/participation/group-participation.ts` | 27 | 709 | runtime |

## Décisions déjà prises

Ces décisions viennent de l’état architectural établi avant ce snapshot et
sont simplement exprimées avec la terminologie canonique. Elles ne sont pas
réinventées par la taille du snapshot.

| PATH | LINES | BYTES | KIND | ARCHITECTURE_DECISION | RATIONALE |
| --- | ---: | ---: | --- | --- | --- |
| `apps/web/src/components/sections/rubriques/partners-network-section.tsx` | 708 | 30807 | runtime | `PROACTIVE_SPLIT` | Découpage déjà décidé pour un lot ultérieur. |
| `apps/web/src/components/chat/chat-shell.tsx` | 719 | 23455 | runtime | `PROACTIVE_SPLIT` | Découpage déjà décidé ; préserver les responsabilités et la structure existantes. |
| `apps/web/src/components/sections/rubriques/elus-section.tsx` | 513 | 28325 | runtime | `PROACTIVE_SPLIT` | Découpage déjà décidé pour un lot ultérieur. |
| `apps/web/src/lib/geo/greater-paris-select.tsx` | 768 | 27711 | runtime | `PROACTIVE_SPLIT` | Découpage déjà décidé pour un lot ultérieur. |
| `apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx` | 631 | 27094 | runtime | `PROACTIVE_SPLIT` | Découpage déjà décidé pour un lot ultérieur. |
| `apps/web/src/lib/auth/api-authorization-contract.ts` | 824 | 32688 | runtime | `COHESIVE_SINGLE_FILE` | Contrat d’autorisation cohésif ; la taille seule ne justifie pas une extraction. |
| `apps/web/src/app/learn/ressources/learn-ressources-client.data.ts` | 677 | 27122 | data/config | `COHESIVE_SINGLE_FILE` | Données du client Learn Ressources conservées comme unité cohésive. |
| `apps/web/src/components/sections/rubriques/methodologie-page-client.tsx` | 638 | 28366 | runtime | `COHESIVE_SINGLE_FILE` | Client de page cohésif ; aucune extraction mécanique par taille. |
| `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | 693 | 34095 | runtime | `ALREADY_MODULARIZED` | Module déjà structuré ; ne pas le requalifier sur le seul signal de taille. |

## Radar des fichiers à auditer

Les entrées suivantes font partie du top 25 mesuré sur cette ref et dépassent
le seuil de revue sans être couvertes par une décision préexistante ci-dessus.
Elles restent `REVIEW_REQUIRED`: ce statut décrit un état d’audit, pas une
prescription de découpage.

| PATH | LINES | BYTES | KIND | ARCHITECTURE_DECISION |
| --- | ---: | ---: | --- | --- |
| `apps/web/src/app/api/actions/group-join/route.test.ts` | 997 | 32039 | test | `REVIEW_REQUIRED` |
| `apps/web/src/app/api/chat/route.test.ts` | 958 | 31932 | test | `REVIEW_REQUIRED` |
| `apps/web/src/lib/route/route-calibration.ts` | 928 | 32232 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/app/api/actions/route.submit.test.ts` | 850 | 26927 | test | `REVIEW_REQUIRED` |
| `apps/web/src/app/api/actions/[actionId]/route.test.ts` | 816 | 27104 | test | `REVIEW_REQUIRED` |
| `apps/web/src/lib/learning/quiz/quiz-personal-progress.ts` | 759 | 25419 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/environmental-impact-estimator/constants.ts` | 721 | 26819 | data/config | `REVIEW_REQUIRED` |
| `apps/web/src/lib/supabase/storage-business-contribution.ts` | 718 | 24975 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/gamification/progression-data.ts` | 712 | 21079 | data/config | `REVIEW_REQUIRED` |
| `apps/web/src/lib/environmental-impact-estimator/project-signals.calculations.ts` | 703 | 22010 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/app/docs/[...segments]/route.ts` | 690 | 19146 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/environmental-impact-estimator/services/infrastructure.ts` | 685 | 25305 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/components/actions/action-declaration/form/use-action-declaration-form.ts` | 681 | 24265 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/app/api/route/recommend/route.response.test.ts` | 681 | 22915 | test | `REVIEW_REQUIRED` |
| `apps/web/src/components/environmental-impact-estimator/environmental-impact-curve-chart.tsx` | 679 | 25443 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/route/route-calibration.test.ts` | 676 | 22507 | test | `REVIEW_REQUIRED` |
| `apps/web/src/components/reports/web-document/sections.tsx` | 674 | 26321 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/pdf-export/simple-pdf.ts` | 668 | 19095 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/geo/greater-paris.ts` | 660 | 16393 | runtime | `REVIEW_REQUIRED` |
| `apps/web/src/lib/environmental-impact-estimator/types.ts` | 652 | 18798 | data/config | `REVIEW_REQUIRED` |
| `apps/web/src/app/api/admin/creator-inbox/route.test.ts` | 647 | 21999 | test | `REVIEW_REQUIRED` |

Le top 25 est un extrait traçable du radar. Les autres fichiers qui dépassent
`REVIEW_THRESHOLD` restent à auditer sans statut architectural implicite.

## Grille d’audit future

Toute future requalification utilise au minimum cette grille. Les champs ne
doivent pas être remplacés par un score numérique ; `REVIEW_REQUIRED` reste le
statut par défaut tant que les faits architecturaux ne sont pas établis.

```text
PATH
REF
LINES
BYTES
KIND
RESPONSIBILITIES
PUBLIC_CONTRACTS
SIDE_EFFECTS
MAIN_CONSUMERS
TEST_BOUNDARY
COUPLING
NATURAL_EXTRACTION_BOUNDARY
ARCHITECTURE_DECISION
RATIONALE
NEXT_TRIGGER
```

`DEFERRED_SPLIT` n’est utilisable que lorsqu’une raison non vide et un
déclencheur explicite de reprise sont documentés. `PROACTIVE_SPLIT` et
`COHESIVE_SINGLE_FILE` exigent eux aussi une justification fondée sur la
structure réelle ; aucun statut ne peut être déduit de la taille seule.

## Portée du lot

Ce document ne refactore aucun candidat du radar. Il a été régénéré depuis la
ref `RADAR_REF` après les modularisations des façades Actions. Une nouvelle
génération doit remplacer `RADAR_REF`, `RADAR_GENERATED_AT` et les mesures avec
le SHA réellement scanné ; elle ne doit pas présenter un snapshot ancien comme
l’état courant.
