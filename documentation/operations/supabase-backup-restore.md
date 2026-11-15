# Sauvegarde Supabase chiffrée et restauration contrôlée

Statut : `CURRENT` — procédure opérationnelle CleanMyMap.

Cette procédure concerne le projet `trktzkgujgpgsgkoyndn` et le workflow manuel
`.github/workflows/supabase-backup.yml`. Elle ne déclenche ni migration, ni
`db push`, ni modification de Production. Le workflow utilise un runner GitHub
hébergé ; Docker n'est jamais lancé sur le poste local.

## Couverture réelle

Le workflow produit, dans un répertoire temporaire puis dans une archive GPG :

- un dump des rôles PostgreSQL ;
- un dump du schéma et un dump des données métier avec la CLI Supabase ;
- l'inventaire des buckets et objets Storage, les chemins, tailles, métadonnées
  retournées par l'API et les SHA-256 des octets ;
- les versions/outils, l'inventaire des migrations et un manifeste de périmètre
  et d'empreintes.

Comme le précise la documentation Supabase, `supabase db dump` exclut les
schémas gérés tels que `auth` et `storage`, ainsi que les schémas d'extensions,
et un backup de base ne contient pas les octets Storage. Les utilisateurs Auth,
leurs métadonnées de fournisseurs, les secrets de projet, les Edge Functions,
la configuration des services gérés et l'historique point-in-time ne sont donc
pas restaurables par cette archive. Le dump public n'est pas une sauvegarde
complète de la plateforme. Les migrations versionnées dans Git restent la
source de reconstruction du schéma.

Le Storage est exporté par l'API officielle avec le secret protégé
`SUPABASE_BACKUP_STORAGE_READ_KEY`. Sa valeur doit être une clé récente
`sb_secret_...`. Le script envoie cette valeur uniquement dans `apikey` et
n'en fabrique jamais un JWT `Authorization: Bearer`. Les autres types de clé,
notamment `service_role`, `anon`, une clé JWT ou une valeur vide, sont rejetés.

Une clé `sb_secret_...` est une capacité privilégiée de la plateforme : elle
contourne la RLS lorsqu'elle est utilisée par l'API. Elle n'est donc pas une clé
Supabase intrinsèquement read-only. La restriction read-only vient uniquement
du code du workflow, qui n'utilise que la liste des buckets, la liste des
objets et les téléchargements d'objets ; il n'ouvre aucune policy Storage aux
utilisateurs ordinaires et n'appelle aucun endpoint mutateur.

La valeur n'est jamais affichée, écrite dans Git, incluse dans le manifeste ou
publiée. Une erreur HTTP, une page de listing invalide, un téléchargement
manquant, une erreur réseau ou une pagination incomplète fait échouer l'export
avant toute publication d'archive.

## Préconditions et exécution

Dans l'environnement protégé GitHub `supabase-production`, configurer les secrets
existants `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_BACKUP_STORAGE_READ_KEY` et `SUPABASE_BACKUP_GPG_PUBLIC_KEY`, ainsi que
la variable d'environnement protégée `SUPABASE_BACKUP_GPG_EXPECTED_FINGERPRINT`.
La variable doit contenir les 40 caractères hexadécimaux majuscules de
l'empreinte attendue, vérifiée hors GitHub avec la personne qui conserve la clé
privée. La CI importe la clé publique, calcule son empreinte et refuse toute
divergence avant l'export ; elle ne possède ni clé privée ni phrase secrète.

Depuis l'onglet Actions, choisir **Supabase encrypted backup**, sélectionner la
branche `main` et saisir exactement `BACKUP_PRODUCTION_NOW`. Toute autre branche
ou valeur arrête le job avant l'export. Le job est séquentiel et l'artefact est
conservé trois jours.

Le workflow vérifie que le dump de rôles, de schéma, de données et l'inventaire
Storage sont non vides. Il construit ensuite un manifeste de SHA-256, vérifie
que chaque fichier présent est déclaré et que chaque empreinte correspond avant
la restauration et le chiffrement. Il rejoue schéma et données dans une base
PostgreSQL éphémère isolée du runner et contrôle contraintes, fonctions et RLS. Cette
preuve ne vaut pas restauration complète de la plateforme : les rôles gérés,
Auth, Storage distant et configuration Supabase demandent une procédure séparée.

En cas d'échec SQL, `psql` conserve `ON_ERROR_STOP=1` et écrit sa sortie complète
uniquement dans un journal temporaire privé avec la verbosité SQLSTATE. Le résumé
GitHub publie seulement `stage`, `exit_code`, le premier SQLSTATE trouvé ou
`UNAVAILABLE`, et une catégorie normalisée. Les préfixes standards de `psql -f`,
par exemple `psql:/tmp/cmm-schema.sql:17: ERROR: 42P01`, sont reconnus ; les
codes présents dans du SQL, des données ou des messages arbitraires ne le sont
pas. Une archive n'est jamais publiée après un échec de restauration.

## Téléchargement, déchiffrement et vérification locale

Télécharger uniquement l'artefact privé depuis GitHub, vérifier l'empreinte de la
clé et le fichier SHA-256, puis déchiffrer localement, jamais dans CI :

```sh
sha256sum -c supabase-backup-<run>.sha256
gpg --decrypt supabase-backup-<run>.tar.gpg > supabase-backup.tar
tar -xf supabase-backup.tar
```

La clé privée et sa phrase secrète restent sur le poste sécurisé de l'utilisateur.
Ne pas déposer l'archive déchiffrée dans GitHub, un cache, un partage public ou
un ticket. Supprimer le tar déchiffré après contrôle, selon la politique locale
de conservation.

## Restauration contrôlée

Restaurer d'abord sur un nouveau projet Supabase isolé ou une instance PostgreSQL
éphémère autorisée, jamais sur Production. Rejouer les migrations canoniques
compatibles, puis appliquer le schéma et les données en contrôlant les extensions,
propriétaires, contraintes, fonctions, RLS et grants. Les rôles doivent être
réconciliés avec les rôles gérés de la cible ; ne pas recopier aveuglément des
secrets ou mots de passe de rôle. Avant une restauration de schéma, appliquer la
précaution Supabase concernant les privilèges par défaut `anon` et
`authenticated`.

Recréer ensuite les buckets et téléverser les octets Storage avec l'API officielle,
en contrôlant chemin, taille, MIME et SHA-256. Reconstituer Auth par un mécanisme
Supabase officiellement supporté et autorisé ; il n'est pas fourni par ce dump.
Valider séparément les clients Web/mobile, RPC, RLS et flux critiques.

## Rotation et incident

Pour une rotation, vérifier la nouvelle clé publique hors CI, la remplacer dans
le secret protégé, exécuter un backup manuel, puis déchiffrer localement avec la
nouvelle clé avant de retirer l'ancienne. Conserver l'ancienne clé uniquement
jusqu'à cette preuve.

En incident, récupérer la dernière archive chiffrée encore dans la rétention
GitHub, vérifier son SHA-256 et son empreinte, la déchiffrer localement, puis
restaurer sur une cible isolée. Ne jamais restaurer directement sur Production
pour contourner une indisponibilité ; la bascule applicative et la récupération
Auth/Storage restent des décisions séparées.

Un run absent, un secret manquant, une empreinte non vérifiée, un échec de replay,
un manifeste incohérent ou un périmètre non couvert doit être classé comme
blocage. `EPHEMERAL_RESTORE: PASS` n'est produit qu'après exécution réelle du
rejeu et des contrôles d'intégrité ; aucun backup réussi ne doit être annoncé
sur la seule présence d'un fichier chiffré. Tant qu'un run réel n'a pas réussi,
que son artefact n'a pas été vérifié et que son déchiffrement local avec
Kleopatra n'a pas été effectué, l'état reste `PARTIAL`.

Voir aussi la stratégie de sortie fournisseur dans
[`vendor-exit-strategy.md`](vendor-exit-strategy.md) ; ce document reste la
source des exports historiques et n'est pas remplacé par cette procédure.
