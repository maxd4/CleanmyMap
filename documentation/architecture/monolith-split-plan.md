# Plan de découpage des monolithes

**État :** plan documentaire et radar de suivi, sans refactor applicatif dans ce lot
**Mis à jour :** 2026-09-15
**Portée :** `apps/web/src`, fichiers suivis `.ts` et `.tsx`
**Règle durable :** cohésion, responsabilités, couplage et testabilité > nombre de lignes

## RADAR CURRENT

Le radar courant a été mesuré exclusivement depuis la ref Git suivante, après
`git fetch origin main` :

```text
RADAR_REF=f72b71cf5c5074494b1056b869697dda10495396
```

Commande informative exécutée :

```text
node scripts/checks/check-top-heavy-files.mjs --ref=f72b71cf5c5074494b1056b869697dda10495396 --max-lines=100000 --max-kb=7 --top=25
```

Commande enforcement exécutée :

```text
node scripts/checks/check-top-heavy-files.mjs --ref=f72b71cf5c5074494b1056b869697dda10495396 --max-lines=1000 --max-kb=50 --top=25 --enforce
```

### Mesures exactes

- `2220` fichiers `.ts/.tsx` sont présents sous `apps/web/src` sur cette ref.
- `563` dépassent le seuil informatif de `7 KiB`, soit `7168` octets.
- Maximum en lignes : `997`, pour `app/api/actions/group-join/route.test.ts`.
- Maximum en octets : `34095` octets, soit `33.3 KiB`, pour
  `components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx`.
- Seuil enforcement : `>1000` lignes ou `>50 KiB`, soit `51200` octets.
- Violations enforcement : `0` (`POLICY_OK`, commande terminée avec le code
  `0`).
- Baseline à cette ref : `allowed: []`.
- Entrées stale de baseline : aucune signalée.
- Les deux commandes ref-based ont atteint leur résultat métier complet sans
  `ENOBUFS`.

Le classement ci-dessous reprend la sortie exacte du top 25. Les octets sont
les octets du blob Git ; la colonne KiB est la représentation arrondie fournie
par le radar. Le seuil informatif déclenche une revue, mais n'impose pas à lui
seul un découpage.

| Rang | Lignes | Octets | KiB | Fichier | Statut architectural |
| ---: | ---: | ---: | ---: | --- | --- |
| 1 | 997 | 32039 | 31.3 | `app/api/actions/group-join/route.test.ts` | À REQUALIFIER |
| 2 | 958 | 31932 | 31.2 | `app/api/chat/route.test.ts` | À REQUALIFIER |
| 3 | 928 | 32232 | 31.5 | `lib/route/route-calibration.ts` | À REQUALIFIER |
| 4 | 850 | 26927 | 26.3 | `app/api/actions/route.submit.test.ts` | À REQUALIFIER |
| 5 | 839 | 29675 | 29.0 | `app/api/actions/[actionId]/route.ts` | À REQUALIFIER |
| 6 | 807 | 26852 | 26.2 | `app/api/actions/[actionId]/route.test.ts` | À REQUALIFIER |
| 7 | 800 | 31003 | 30.3 | `lib/auth/api-authorization-contract.ts` | COHÉSIF / NE PAS DÉCOUPER PAR TAILLE |
| 8 | 797 | 25555 | 25.0 | `lib/actions/store.ts` | À REQUALIFIER |
| 9 | 768 | 27711 | 27.1 | `lib/geo/greater-paris-select.tsx` | À DÉCOUPER |
| 10 | 759 | 25419 | 24.8 | `lib/learning/quiz/quiz-personal-progress.ts` | À REQUALIFIER |
| 11 | 721 | 26819 | 26.2 | `lib/environmental-impact-estimator/constants.ts` | À REQUALIFIER |
| 12 | 718 | 24975 | 24.4 | `lib/supabase/storage-business-contribution.ts` | À REQUALIFIER |
| 13 | 714 | 23186 | 22.6 | `components/chat/chat-shell.tsx` | À DÉCOUPER |
| 14 | 712 | 21079 | 20.6 | `lib/gamification/progression-data.ts` | À REQUALIFIER |
| 15 | 708 | 30807 | 30.1 | `components/sections/rubriques/partners-network-section.tsx` | À DÉCOUPER |
| 16 | 706 | 21614 | 21.1 | `lib/actions/participation/group-participation.ts` | À REQUALIFIER |
| 17 | 703 | 22010 | 21.5 | `lib/environmental-impact-estimator/project-signals.calculations.ts` | À REQUALIFIER |
| 18 | 693 | 34095 | 33.3 | `components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | DÉJÀ STRUCTURÉ / REQUALIFICATION NON JUSTIFIÉE |
| 19 | 690 | 19146 | 18.7 | `app/docs/[...segments]/route.ts` | À REQUALIFIER |
| 20 | 685 | 25305 | 24.7 | `lib/environmental-impact-estimator/services/infrastructure.ts` | À REQUALIFIER |
| 21 | 681 | 24265 | 23.7 | `components/actions/action-declaration/form/use-action-declaration-form.ts` | À REQUALIFIER |
| 22 | 681 | 22915 | 22.4 | `app/api/route/recommend/route.response.test.ts` | À REQUALIFIER |
| 23 | 679 | 25443 | 24.8 | `components/environmental-impact-estimator/environmental-impact-curve-chart.tsx` | À REQUALIFIER |
| 24 | 677 | 27122 | 26.5 | `app/learn/ressources/learn-ressources-client.data.ts` | COHÉSIF / NE PAS DÉCOUPER PAR TAILLE |
| 25 | 676 | 22507 | 22.0 | `lib/route/route-calibration.test.ts` | À REQUALIFIER |

Le top 25 ne constitue pas la liste complète des fichiers informatifs : `538`
autres fichiers dépassent `7 KiB`. Ils restent des éléments de radar, sans
décision architecturale automatique.

## LOTS TERMINÉS ET FAÇADES SORTIES DU RADAR

Les vérifications suivantes ont été faites par lecture directe des blobs de
`RADAR_REF`, et non en reprenant le tableau historique du 5 septembre.

| Cible historique | État sur `RADAR_REF` |
| --- | --- |
| Weather | `weather-section.tsx` : `97` lignes / `3682` octets ; `weather-section.preparation.tsx` : `84` / `2337` ; sorties du radar informatif. |
| Rejoindre | La façade principale (`85` / `3770`) et le module partagé (`19` / `493`) sont sortis. Le contrôleur reste présent à `249` lignes / `9168` octets et demeure un candidat distinct. |
| Quiz Bank Admin | `components/admin/quiz-bank-admin-view.tsx` : `148` / `6329`, sorti du radar informatif. |
| Learn Ressources Sections | `app/learn/ressources/learn-ressources-client.sections.tsx` : `13` / `539`, sortie. Le module de données reste présent dans le radar à `677` / `27122`. |
| Gamification | `index.tsx` : `119` / `4026` et `gamification-panels.tsx` : `14` / `529`, sortis. `lib/gamification/progression-data.ts` reste un fichier différent à requalifier. |
| Navigation Ribbon | `app-navigation-ribbon.tsx` : `21` / `623`, sorti. |
| Free Plan Services Visual | La façade `free-plan-services-methodology-visual.tsx` est à `82` / `3067`, sortie. Le module `.impact.tsx` reste présent et est classé séparément dans les décisions déjà prises. |
| Governance Monthly Report | `lib/governance/governance-monthly-report.ts` : `13` / `566`, sorti. |
| Chat API route | `app/api/chat/route.ts` : `3` / `72`, sorti. `route.test.ts` est un fichier de test séparé, encore dans le radar et à requalifier. |
| Map Layers | `components/actions/map/map-layers.tsx` : `17` / `522`, sorti. |
| Action Declaration Export Picker | `components/actions/action-declaration/form/action-declaration-export-picker.tsx` : `37` / `824`, sorti. |

`Learn Practice Theme Tabs` n'est pas déclaré terminé :
`components/learn/learn-practice-theme-tabs.tsx` reste dans le radar à
`264` lignes / `11434` octets. La sortie d'une façade ne vaut pas sortie de
tous les modules du domaine.

## DÉCISIONS ARCHITECTURALES DÉJÀ PRISES

Ces décisions sont reprises telles quelles ; ce lot ne les réévalue pas et ne
demande pas au radar de les déduire de la taille.

### À DÉCOUPER

| Fichier | Mesure actuelle | Périmètre de la décision |
| --- | ---: | --- |
| `components/sections/rubriques/partners-network-section.tsx` | `708` lignes / `30807` octets | Découpage à traiter dans un lot ultérieur. |
| `components/chat/chat-shell.tsx` | `714` / `23186` | Le futur lot cible uniquement les responsabilités encore inline. L'architecture de hooks et de composants déjà existante ne doit pas être reconstruite. |
| `components/sections/rubriques/elus-section.tsx` | `513` / `28325` | Découpage à traiter dans un lot ultérieur. |
| `lib/geo/greater-paris-select.tsx` | `768` / `27711` | Découpage à traiter dans un lot ultérieur. |
| `components/sections/rubriques/feedback-section-dashboard.tsx` | `631` / `27094` | Découpage à traiter dans un lot ultérieur. |

### COHÉSIF / NE PAS DÉCOUPER PAR TAILLE

| Fichier | Mesure actuelle | Motif |
| --- | ---: | --- |
| `lib/auth/api-authorization-contract.ts` | `800` lignes / `31003` octets | Contrat d'autorisation cohésif ; la taille seule ne justifie pas une extraction. |
| `app/learn/ressources/learn-ressources-client.data.ts` | `677` / `27122` | Données du client Learn Ressources conservées comme unité cohésive. |
| `components/sections/rubriques/methodologie-page-client.tsx` | `638` / `28366` | Client de page cohésif ; aucune extraction mécanique par taille. |

### DÉJÀ STRUCTURÉ / REQUALIFICATION NON JUSTIFIÉE

| Fichier | Mesure actuelle | Décision |
| --- | ---: | --- |
| `components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | `693` lignes / `34095` octets | Module déjà structuré ; ne pas le requalifier sur le seul signal de taille. |

## CANDIDATS RESTANTS

Les candidats actuellement visibles sont les fichiers du radar qui ne sont ni
sortis, ni couverts par une décision déjà prise. Le top 25 les rend mesurables
et traçables ; les autres `538` fichiers informatifs restent à inventorier au
fil des décisions, sans classement architectural implicite.

### À REQUALIFIER

Les fichiers suivants, présents dans le top 25 et sans décision préalable,
sont à requalifier par ChatGPT avant tout futur lot :

- `app/api/actions/group-join/route.test.ts`
- `app/api/chat/route.test.ts`
- `lib/route/route-calibration.ts`
- `app/api/actions/route.submit.test.ts`
- `app/api/actions/[actionId]/route.ts`
- `app/api/actions/[actionId]/route.test.ts`
- `lib/actions/store.ts`
- `lib/learning/quiz/quiz-personal-progress.ts`
- `lib/environmental-impact-estimator/constants.ts`
- `lib/supabase/storage-business-contribution.ts`
- `lib/gamification/progression-data.ts`
- `lib/actions/participation/group-participation.ts`
- `lib/environmental-impact-estimator/project-signals.calculations.ts`
- `app/docs/[...segments]/route.ts`
- `components/actions/action-declaration/form/use-action-declaration-form.ts`
- `app/api/route/recommend/route.response.test.ts`
- `components/environmental-impact-estimator/environmental-impact-curve-chart.tsx`
- `lib/environmental-impact-estimator/services/infrastructure.ts`

Cette liste est un état de radar, pas un audit architectural. Aucun de ces
fichiers ne reçoit automatiquement le statut `À DÉCOUPER`.

## HISTORY

Le scan du 5 septembre est conservé comme historique de traçabilité, pas comme
radar courant : il signalait `503` fichiers au-dessus de `7 KiB`, avec des
tailles alors présentées dans un tableau désormais obsolète. Il ne doit plus
être utilisé pour décrire l'état actuel, ni pour réintroduire comme critiques
les façades sorties depuis.

Le radar courant doit toujours être régénéré depuis la ref Git exacte annoncée
par `RADAR_REF`. Le worktree dirty, les fichiers untracked et les changements
parallèles ne constituent jamais une baseline.

## RÈGLES DURABLES

- Un seuil de taille est un signal de revue, jamais une obligation de split.
- La décision dépend de la cohésion, des responsabilités, du couplage, de la
  testabilité et des contrats ; aucune cible générale du type `<150 lignes` ou
  `<200 lignes` n'est imposée.
- Un futur lot doit expliciter sa décision architecturale avant de modifier un
  candidat (`À DÉCOUPER`, `COHÉSIF / NE PAS DÉCOUPER PAR TAILLE` ou
  `DÉJÀ STRUCTURÉ / REQUALIFICATION NON JUSTIFIÉE`).
- Les façades sorties du radar ne doivent pas être recréées pour masquer une
  logique restante ; les responsabilités encore présentes doivent être
  évaluées sur leurs propres frontières.
- Ce document ne constitue pas une autorisation de refactor applicatif. Toute
  modification de code doit faire l'objet d'un lot séparé et ciblé.

## PROVENANCE ET VALIDATION DU RADAR

Les commandes ref-based ci-dessus ont été exécutées sur
`f72b71cf5c5074494b1056b869697dda10495396`. Le contrôle informatif s'est
terminé avec `INFORMATIVE_EXIT=0` et le contrôle enforcement avec
`ENFORCEMENT_EXIT=0`. Aucun `ENOBUFS` n'a été reproduit. Le présent lot ne
modifie ni le checker, ni la baseline heavy-files, ni le code applicatif.
