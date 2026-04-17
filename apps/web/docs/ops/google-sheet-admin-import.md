# Google Sheet Admin Import (Historique Actions)

## Objectif
Importer des historiques d'actions depuis Google Sheet sans passer par les formulaires utilisateurs.

## Lien Sheet détecté dans le repo
- Source par défaut: `https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/export?format=csv&gid=0`
- Script existant: `apps/web/scripts/sync-real-data-from-sheet.mjs`

## Colonnes recommandées (template admin)
Utiliser le template: `apps/web/data/raw/google-sheet-admin-template.csv`

Colonnes:
- `action_date` (YYYY-MM-DD, requis)
- `location_label` (requis)
- `city` (optionnel)
- `latitude` (optionnel)
- `longitude` (optionnel)
- `waste_kg`
- `cigarette_butts`
- `volunteers_count`
- `duration_minutes`
- `association_name` (optionnel)
- `enterprise_name` (optionnel, converti en `Entreprise - <Nom>`)
- `actor_name` (optionnel)
- `status` (`approved`/`pending`/`rejected`)
- `notes` (optionnel)
- `type` (optionnel, copié en notes système)

## Générer un payload JSON d'import admin
Depuis la racine du repo:

```bash
npm --prefix apps/web run data:sheet:build-import
```

Avec URL personnalisée:

```bash
npm --prefix apps/web run data:sheet:build-import -- "https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=0"
```

Avec géocodage automatique des lignes sans coordonnées:

```bash
npm --prefix apps/web run data:sheet:build-import -- --geocode
```

Sorties:
- CSV brut récupéré: `apps/web/data/raw/google-sheet-admin-actions.csv`
- Payload admin prêt à l'emploi: `apps/web/data/raw/google-sheet-admin-import.json`
- CSV "mode formulaire web": `apps/web/data/raw/google-sheet-form-like.csv`
- Payload lieux propres: `apps/web/data/raw/google-sheet-clean-places-import.json`
- CSV lieux propres (logique `clean_place`): `apps/web/data/raw/google-sheet-clean-places-form-like.csv`

## Import vers le backend admin
Le payload généré est compatible avec `/api/actions/import` (dry-run puis confirmation).

Remarque:
- `association_name` est persisté avec la même normalisation que le formulaire.
- Pour les lignes entreprise: renseigner `enterprise_name` pour éviter de fusionner tous les cas RSE.
- Les associations hors référentiel sont automatiquement rabattues sur `Action spontanee` avec traçabilité dans `notes` (`Original association: ...`).
- La colonne `liste lieux propres` est traitée séparément et exportée en objets `clean_place` (logique site dédiée, distincte des actions).

## Sync direct vers Supabase (carte web)
Commande unique (rebuild depuis Google Sheet + import en base):

```bash
npm --prefix apps/web run data:sheet:sync-supabase
```

Effet:
- écrit les lignes `actions` dans `public.actions`
- écrit les lieux propres dans `public.spots` (`waste_type=clean_place`)
- supprime d'abord les anciennes lignes importées par ce même flux (idempotent)

Variables requises:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Options:
- `--skip-build` pour réutiliser les payloads déjà générés
- `--system-user-id=<id>` pour changer le `created_by_clerk_id` technique

## Push automatique vers Google Sheets (API)
Script pret a l'emploi:
- `apps/web/scripts/push-google-sheet-from-form-like.mjs`

Commande:

```bash
npm --prefix apps/web run data:sheet:push
```

Variables d'environnement requises:
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (avec `\n` dans la valeur)

Variables optionnelles:
- `GOOGLE_SHEETS_TAB_ACTIONS` (defaut: `actions_form_like`)
- `GOOGLE_SHEETS_TAB_CLEAN_PLACES` (defaut: `clean_places_form_like`)
- `GOOGLE_SHEETS_CLEAR_BEFORE_WRITE` (`true`/`false`, defaut: `true`)

Pre-requis Google:
- Creer un service account GCP avec acces `Google Sheets API`.
- Partager le Google Sheet cible avec l'email du service account (editeur).
- Generer les donnees locales avant push:

```bash
npm --prefix apps/web run data:sheet:build-import -- --geocode
```
