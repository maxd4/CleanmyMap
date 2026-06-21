# Traceability Matrix

## Objet

Consolider la tracabilite documentaire demandee par le backlog actif :

`rubrique -> route -> composant -> API -> source de donnee`

Cette matrice v1 couvre les parcours coeur les plus exposes dans le pilotage DU.

## Matrice des parcours coeur

| Rubrique / usage | Route | Composant principal | API / endpoint | Source de donnee |
| --- | --- | --- | --- | --- |
| Pilotage terrain | `apps/web/src/app/(app)/dashboard/page.tsx` | `apps/web/src/components/dashboard/business-alerts-panel.tsx` | `apps/web/src/app/api/pilotage/overview/route.ts` | `apps/web/src/lib/pilotage/*`, agregations actions / comparaison periode |
| Sante des services | `apps/web/src/app/(app)/admin/services/page.tsx` | interface admin services | `apps/web/src/app/api/services/route.ts` | `apps/web/src/lib/env.ts`, `apps/web/src/lib/services/registry.ts`, variables d'environnement |
| Carte des actions | `apps/web/src/app/(app)/actions/map/page.tsx` | `apps/web/src/components/actions/map/*` | `apps/web/src/lib/actions/http.ts` + RPC `actions_map_feed` | `apps/web/src/lib/actions/store.ts`, source unifiee actions |
| Declaration d'action (alias legacy `/declaration`) | `apps/web/src/app/(app)/actions/new/page.tsx` | `apps/web/src/components/actions/action-declaration-form/*` | `apps/web/src/app/api/actions/route.ts` | `apps/web/src/components/actions/action-declaration/payload.ts`, store actions, Supabase/local store |
| Historique actions | `apps/web/src/app/(app)/actions/history/page.tsx` | `apps/web/src/components/actions/actions-history-list.tsx` | lecture via flux actions et exports | `apps/web/src/lib/actions/store.ts`, derivees de geo-tracabilite |
| Rapports web | `apps/web/src/app/(app)/reports/page.tsx` | `apps/web/src/components/reports/reports-web-document.tsx` | `apps/web/src/app/api/reports/actions.csv/route.ts`, `apps/web/src/app/api/reports/actions.json/route.ts`, `apps/web/src/app/api/reports/elus-dossier/route.ts` | `apps/web/src/components/reports/web-document/analytics/*`, source actions et KPI |
| Observatoire public | `apps/web/src/app/(app)/observatoire/page.tsx` | `apps/web/src/components/reports/*`, `apps/web/src/components/ui/rubrique-pdf-export-button.tsx` | `apps/web/src/app/api/reports/actions.csv/route.ts`, `apps/web/src/app/api/reports/actions.json/route.ts`, `apps/web/src/app/api/reports/elus-dossier/route.ts` | `apps/web/src/lib/pilotage/*`, `apps/web/src/lib/actions/unified-source.ts`, agrégations mensuelles |
| Moderation admin | `apps/web/src/app/(app)/admin/page.tsx` | `apps/web/src/components/reports/admin-workflow/*` | `apps/web/src/app/api/admin/moderation/route.ts` | `apps/web/src/lib/admin/*`, journal de moderation, source actions |
| Explorer / sections | `apps/web/src/app/(app)/explorer/page.tsx`, `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` | `apps/web/src/components/sections/*` | endpoints varies selon rubrique | `apps/web/src/lib/sections-registry/config.ts`, `apps/web/src/lib/navigation.ts`, sources par rubrique |

## Source of truth recommandees

- cartographie routes : `apps/web/src/app`
- cartographie composants coeur : `apps/web/src/components`
- cartographie APIs : `apps/web/src/app/api`
- cartographie navigation / rubriques : `apps/web/src/lib/navigation.ts`, `apps/web/src/lib/sections-registry/config.ts`
- cartographie donnees terrain : `apps/web/src/lib/actions/store.ts`
- cartographie services externes : `apps/web/src/lib/services/registry.ts`
- routes canoniques publiques : `/explorer`, `/reports`, `/sections/feedback`, `/sections/community`, `/sections/messagerie`, `/sections/open-data`, `/sections/sandbox`
- alias legacy documentes : `/declaration` -> `/actions/new`, `/community` -> `/sections/community`, `/messagerie` -> `/sections/messagerie`, `/open-data` -> `/sections/open-data`, `/sandbox` -> `/sections/sandbox`
- pages wrapper alias dans le code : `apps/web/src/app/(app)/community/page.tsx`, `apps/web/src/app/(app)/messagerie/page.tsx`, `apps/web/src/app/(app)/open-data/page.tsx`, `apps/web/src/app/(app)/sandbox/page.tsx`, `apps/web/src/app/(app)/declaration/page.tsx`

## Limites actuelles

- certaines rubriques `Explorer` et `Sections` deleguent vers plusieurs composants et plusieurs APIs ; une matrice plus fine par sous-rubrique reste utile ;
- les flux PDF/CSV sont encore distribues entre plusieurs composants et endpoints ;
- les flux `compare` / `climate` ne sont pas encore consolides ici en tant que parcours autonomes.

## Suite recommandee

- relier cette matrice au dossier institutionnel ;
- ajouter une colonne `responsable humain` par parcours ;
- etendre la matrice aux exports, au sandbox et a la reprise incident.
