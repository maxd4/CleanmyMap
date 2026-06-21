# Local Data Backup Stores

This directory keeps a durable local backup for map records.

- `test_records.json`: anonymized test/demo records only.
- `real_records.json`: normalized real-world records imported from Google Sheet.
- `validated_records.json`: records explicitly validated by admins (copied from database rows).

Schema (all files):

- `version`: store version.
- `updatedAt`: ISO timestamp of last write.
- `records[]`:
  - `id`
  - `recordType` (`action` | `clean_place` | `other`)
  - `status` (`test` | `pending` | `validated` | `rejected`)
  - `source`
  - `title` (for actions: name of the organizing structure), `description`
  - `location` (`label`, `city`, `latitude`, `longitude`)
  - `eventDate`
  - `metrics` (for actions)
  - `map` (`displayable`, `lat`, `lon`)
  - `trace` (`externalId`, `originTable`, `validatedBy`, `validatedAt`, `importedAt`, `notes`)

Operational scripts:

- `npm run data:test:build`
- `npm run data:validated:sync`

Historical note:

- The Google Sheet import and `data:real:sync` flow are retired and no longer used as source of truth.
