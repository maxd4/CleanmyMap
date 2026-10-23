# Data pipeline import (visual-first)

## Diagramme global source -> normalisation -> stockage -> restitution
```mermaid
flowchart LR
  S1[Source Google Sheet CSV historique] --> N1[Extraction & parsing]
  N1 --> N2[Normalisation metier]
  N2 --> N3[Validation qualité]
  N3 --> ST1[Stockage runtime : public.actions + public.trash_spotter_spots]
  ST1 --> R1[Restitution API actions/map/reports]
  N3 --> E1[Erreurs de schema/qualite]
  N1 --> E2[Erreurs d'acces Sheet/CSV]
  ST1 --> E3[Erreurs DB/env]
```
## Origines et statuts des sources

- **Terrain interne** : actions déclarées par citoyens ou collectifs, spots et
  statuts de nettoyage, événements communautaires et RSVP. Les parcours de
  restitution (carte, historique, rapports, pilotage) sont distincts des
  contrats d'écriture de ces entités.
- **Externe** : import historique Google Sheet administrateur ; météo et
  événements locaux éventuels servent de contexte, pas de preuves de ramassage.
- **Contrôles** : provenance de l'import traçable et qualité validée avant
  exploitation analytique. Le schéma de normalisation distingue action, spot,
  événement communautaire et progression, sans supposer un endpoint d'import
  commun à ces quatre familles.
- **Contenus éditoriaux ou institutionnels** : ils ne passent pas par l'import
  d'actions. Leur source, date, précision, niveau de preuve, responsable et revue
  relèvent de [la validation des contenus](../../architecture/content-validation.md)
  et de `apps/web/src/lib/content/content-validation.ts` ; les faits,
  estimations et recommandations restent séparés.

## Etapes avec entree/sortie/erreurs connues
| Etape | Entree | Sortie | Erreurs connues |
|---|---|---|---|
| Extraction & parsing | URL CSV Google Sheet, snapshots locaux | CSV brut local | Sheet non accessible, HTML au lieu de CSV, encodage invalide |
| Normalisation metier | CSV brut + mapping colonnes | Payload JSON admin + payload lieux propres | Colonnes manquantes, types invalides, association non reconnue |
| Validation qualite | Payload normalise | Payload validable importable | Geoloc manquante/incoherente, dates invalides, champs requis absents |
| Stockage Supabase | Payload valide + env Supabase | Lignes `public.actions` et `public.trash_spotter_spots` | `SUPABASE_SERVICE_ROLE_KEY` absente, échec insertion, conflit idempotence |
| Restitution API | Donnees stockees | `/api/actions`, RPC `actions_map_feed`, exports reports | Contrat data casse, mismatch champs, reponse partielle |

### Frontière des tables

- `public.actions` est la table canonique des actions.
- `public.trash_spotter_spots` est la cible unique de tout nouveau
  signalement `spot` ou `clean_place`.
- `public.spots` est une archive legacy read-only. Elle est hors du chemin
  d'import runtime : aucune nouvelle écriture, modération ou restitution
  runtime ne doit la cibler. Une lecture explicite reste réservée aux
  opérations de maintenance ou d'export historiques.

## Mapping historique des colonnes (illustratif)

Ce tableau conserve le repérage des anciennes colonnes Google Sheet ; **il ne
constitue pas un schéma exécutable**. Pour un import réel, les champs, valeurs
admises et transformations sont ceux du parseur et de l'API présents sur `main`,
notamment `apps/web/src/app/api/actions/import/route.ts`. Une colonne inconnue,
une valeur nulle, une valeur invalide ou une exclusion doit être tracée ; aucune
transformation implicite ne doit contourner les validations applicatives.

| Colonne source | Transformation | Champ produit |
|---|---|---|
| `action_date` | date ISO | `action_date` |
| `location_label` | trim + required | `location_label` |
| `latitude` + `longitude` | parse float + bornes | `geo.latitude` / `geo.longitude` |
| `association_name` | normalisation catalogue | `association_name` |
| `enterprise_name` | prefix `Entreprise -` | `enterprise_name` |
| `status` | mapping enum | `status` |
| `notes` | conserve + traces systeme | `notes` |

La normalisation des libellés organisation/zone, dates et coordonnées, les
anomalies de mesure et les doublons source doivent être explicités avant
confirmation. Les entrées partielles ou rejetées ne sont pas supprimées
silencieusement : journaliser leur cause et rendre l'exclusion auditable.
L'ancien schéma de nettoyage suggérait un statut par défaut pour les valeurs
inconnues : ce n'est **pas** une autorisation de forcer un statut non reconnu ;
le contrat Zod de l'import et la validation métier en vigueur prévalent.

## Normalisation et contrôle qualité avant écriture

- Entités conceptuelles : action, spot, événement communautaire et profil de
  progression. Date, localisation, statut et auteur ou source sont normalisés
  selon le contrat du type d'entité ; volumes et mesures restent qualifiés
  avant agrégation.
- La qualité distingue déclaration ou mesure, dérivation, estimation/proxy et
  absence de donnée. La source scientifique canonique détermine la portée des
  métriques, jamais un schéma illustratif d'import.

Les imports externes administrateur passent par `normalizeExternalActionImport` dans
`apps/web/src/lib/actions/unified-source.ts`, puis par `createAction`. Une insertion
directe dans `actions` n'est pas un chemin d'import valide : elle contourne les
organisateurs, la geometrie persistee et les metadonnees du contrat.

Le compte qui exécute `/api/actions/import` est un acteur technique d'ingestion
et d'audit. Il n'est pas ajouté automatiquement à `action_organizers`. La
relation organisateur n'est persistée que lorsqu'elle est fournie et résolue par
le contrat métier ; une source qui ne connaît pas l'organisateur conserve une
relation absente. `GRANTED_ROLE`, `publicMetadata.role`, `ACTIVE_ROLE` et les
fallbacks de création ne deviennent jamais des `organizerIds` de décision
AuthZ. Les fallbacks de création existants ne s'appliquent qu'au moment où une
relation explicite est effectivement persistée et ne sont pas des fallbacks de
lecture ou d'autorisation.

Le resume de qualite est versionne par
`apps/web/src/lib/actions/quality/data-quality.ts` et distingue :

- `measured` : valeur declaree ou relevee sur le terrain ;
- `derived` : valeur calculee a partir d'autres donnees, notamment l'impact ;
- `estimated` : valeur issue d'une estimation provisoire ou d'une geometrie estimee ;
- `missing` : valeur non disponible.

Les anomalies `invalid_date`, `invalid_measure`, `implausible_measure`,
`partial_coordinates`, `invalid_coordinates` et `missing_location_label` sont
bloquantes pour une confirmation d'import. `missing_coordinates` est une alerte :
l'action peut rester exploitable dans les listes et rapports, mais elle est exclue
de la couverture cartographique. La paire latitude/longitude est toujours evaluee
ensemble ; une seule coordonnee renseignee est donc explicitement `partial`.

La revue mensuelle est disponible via l'endpoint admin existant avec
`/api/reports/governance-monthly?quality=1&month=YYYY-MM`. Elle restitue les taux,
les anomalies par code, la couverture geographique, la provenance des mesures et
les alertes de seuil.

## Sequence d'execution recommandee
```mermaid
sequenceDiagram
  participant Ops as Operateur
  participant Build as Build script
  participant Import as Import API/script
  participant DB as Supabase
  participant API as API restitution
  Ops->>Build: data:sheet:build-import (--geocode optionnel)
  Build-->>Ops: payloads JSON + CSV
  Ops->>Import: flux retire
  Import->>DB: écriture public.actions
  Import->>DB: écriture public.trash_spotter_spots pour les nouveaux spot/clean_place
  DB-->>Import: statut insertion
  Import-->>Ops: resultat sync
  Ops->>API: verifier /api/actions et le RPC actions_map_feed
  Note over DB: public.spots reste une archive legacy read-only, hors de la séquence d'import runtime
```

## Flowchart build -> import -> sync
```mermaid
flowchart TD
  A[Build import depuis Sheet historique] --> B{Payload JSON/CSV genere ?}
  B -- Non --> B1[Corriger mapping/colonnes source]
  B -- Oui --> C[Import vers Supabase]
  C --> D{Insertions DB valides ?}
  D -- Non --> D1[Verifier env/droits/contrat]
  D -- Oui --> E[Sync et verification API map/reports]
  E --> F{Restitution cohérente ?}
  F -- Non --> F1[Corriger contrat et rejouer sync]
  F -- Oui --> G[Pipeline OK]
```

## Commandes
```bash
npm --prefix apps/web run data:sheet:build-import
npm --prefix apps/web run data:sheet:build-import -- --geocode
```

La synchronisation directe Google Sheet -> Supabase est retiree.

## Variables critiques
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLEANMYMAP_SHEET_URL` (si override source)

## Decision tree de depannage
```mermaid
flowchart TD
  A[Echec pipeline] --> B{Erreur extraction ?}
  B -- Oui --> B1[Verifier partage Sheet + URL CSV]
  B -- Non --> C{Erreur normalisation ?}
  C -- Oui --> C1[Verifier colonnes/template]
  C -- Non --> D{Erreur stockage ?}
  D -- Oui --> D1[Verifier env Supabase + droits]
  D -- Non --> E[Verifier contrat API restitution]
```
