# Sauvegarde Supabase chiffrée et restauration contrôlée

Statut : `CURRENT` — procédure opérationnelle CleanMyMap.

Cette procédure concerne le projet `trktzkgujgpgsgkoyndn`, le workflow manuel et
mensuel `.github/workflows/supabase-backup.yml` et la preuve CI
`.github/workflows/supabase-backup-restore-proof.yml`. Elle ne déclenche ni
migration, ni `db push`, ni modification de Production. Les workflows utilisent
un runner GitHub hébergé ; Docker n'est jamais lancé sur le poste local.

## Couverture réelle

Le workflow produit, dans un répertoire temporaire puis dans une archive GPG :

- un dump des rôles PostgreSQL ;
- un dump du schéma et des données métier des schémas applicatifs `public` et
  `private` avec la CLI Supabase ; ce périmètre explicite est appliqué aux deux
  dumps ;
- l'inventaire des buckets et objets Storage, les chemins, tailles, métadonnées
  retournées par l'API et les SHA-256 des octets ;
- les versions/outils, l'inventaire des migrations et un manifeste de périmètre
  et d'empreintes.

Comme le précise la documentation Supabase, `supabase db dump` exclut les
schémas gérés tels que `auth` et `storage`, ainsi que les schémas d'extensions.
Le workflow borne en plus les deux dumps aux schémas applicatifs `public,private`,
qui portent les données métier et les helpers privés de CleanMyMap ; il refuse
toute relation de données non présente
après le rejeu du schéma au lieu de l'exclure silencieusement. Un backup de base
ne contient pas les octets Storage. Les utilisateurs Auth,
leurs métadonnées de fournisseurs, les secrets de projet, les Edge Functions,
la configuration des services gérés et l'historique point-in-time ne sont donc
pas restaurables par cette archive. Le dump applicatif n'est pas une sauvegarde
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

Pour la conservation R2, configurer dans le même environnement :

- variable `SUPABASE_BACKUP_R2_ENDPOINT`, sous la forme `https://<account-id>.r2.cloudflarestorage.com` ;
- variable `SUPABASE_BACKUP_R2_BUCKET` ;
- variable facultative `SUPABASE_BACKUP_R2_OBJECT_PREFIX` (défaut `supabase-backups`) ;
- secret `SUPABASE_BACKUP_R2_ACCESS_KEY_ID` limité à ce bucket ;
- secret `SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY` limité à `HeadObject`, `PutObject` et `GetObject` sur ce préfixe.

Ces identifiants ne doivent pas avoir `DeleteObject`, `ListBucket`, `PutBucketLifecycle` ou une permission de modification des règles de rétention. La publication R2 réelle reste `NOT_VERIFIED` tant qu'un transfert et une récupération réels n'ont pas été testés avec cette configuration.

Depuis l'onglet Actions, choisir **Supabase encrypted backup**, sélectionner la
branche `main` et saisir exactement `BACKUP_PRODUCTION_NOW` pour un run manuel.
Toute autre branche ou valeur arrête le job avant l'export. Le déclencheur mensuel
du premier jour à 02:17 UTC reste inactif tant que
`SUPABASE_BACKUP_MONTHLY_ENABLED` n'est pas exactement `true`. Le job est
séquentiel ; l'artefact GitHub est conservé trois jours et l'archive pérenne est
publiée dans R2.

Le workflow vérifie que le dump de rôles, de schéma, de données et l'inventaire
Storage sont non vides. Il construit ensuite un manifeste de SHA-256, vérifie
que chaque fichier présent est déclaré et que chaque empreinte correspond avant
la restauration et le chiffrement. Il rejoue schéma et données dans une base
PostgreSQL éphémère isolée du runner et contrôle contraintes, fonctions et RLS. Cette
preuve ne vaut pas restauration complète de la plateforme : les rôles gérés,
Auth, Storage distant et configuration Supabase demandent une procédure séparée.

En cas d'échec SQL, `psql` conserve `ON_ERROR_STOP=1` et écrit la sortie détaillée
(`VERBOSITY=verbose`) uniquement dans un journal temporaire privé. Le résumé
GitHub publie seulement `stage`, `exit_code`, le premier SQLSTATE trouvé ou
`UNAVAILABLE`, et une catégorie normalisée. Les préfixes standards de `psql -f`
sont reconnus ; le message, le SQL, les données et les secrets restent privés.
Ces journaux ne sont pas téléversés. Si un artefact de diagnostic devient
nécessaire ultérieurement, il doit être chiffré avec la clé GPG protégée avant
toute publication. Une archive n'est pas publiée après un échec de manifeste,
de chiffrement ou de conservation. Un échec du restore-check est au contraire
publié uniquement comme `RESTORE_FAILED` dans le résumé non sensible ; il ne
bloque pas la conservation d'une archive dont `BACKUP_CREATED` a été confirmé
par le transfert et la récupération R2.

## Téléchargement, déchiffrement et vérification locale

Récupérer l'objet privé et son `.sha256` depuis R2 (ou l'artefact court GitHub en
secours), vérifier l'empreinte de la clé et le fichier SHA-256, puis déchiffrer
localement, jamais dans CI :

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

Les deux workflows utilisent exactement l'exécuteur partagé
`scripts/ci/run-supabase-restore-check.sh`. La cible est dérivée de la
configuration canonique `apps/web/supabase/config.toml` par
`scripts/ci/prepare-supabase-restore-target.mjs`, avec un identifiant et des
ports isolés ; les sections migrations et seed sont désactivées sans remplacer
la configuration Supabase par un fichier minimal divergent. `supabase start` n'y
applique donc ni l'arbre de migrations métier de `apps/web`, ni son seed.

L'exécuteur conserve les objets gérés nécessaires au runtime Supabase dans la
base `postgres`, puis prépare les rôles référencés sans recopier aveuglément
leurs attributs sensibles. Le préflight des rôles n'est pas considéré comme une
autorisation suffisante :
`scripts/ci/prepare-supabase-restore-roles.mjs` essaie l'administrateur
éphémère disponible et exécute une sonde transactionnelle privée qui vérifie la
création d'un rôle de test, l'altération des rôles référencés et les grants de
membership, puis annule la transaction. Seul cet administrateur explicitement
autorisé exécute `roles.sql` et les étapes suivantes. Un échec de la sonde
arrête le restore avant `roles.sql` et publie uniquement un SQLSTATE et une
catégorie ; le journal détaillé reste temporaire et privé.

Après sélection de l'administrateur, l'exécuteur révoque les privilèges par
défaut `anon`/`authenticated` avant le schéma, rejoue `roles.sql`, prépare
ensuite les dépendances de restauration avec
`scripts/ci/supabase-restore-extension-preflight.sql`, puis rejoue `schema.sql`.
Le préflight installe dans `extensions` les versions majeures compatibles de
`postgis`, `pg_trgm`, `uuid-ossp` et `pgcrypto`, puis vérifie le type
`extensions.geometry`, les classes `gist_geometry_ops_2d` et `gin_trgm_ops`.
Une absence, un mauvais schéma ou une version incompatible fait échouer le
restore avant le schéma métier ; le préflight n'est pas une migration.

Le contrôle compare d'abord les relations référencées par les instructions
`COPY` et `setval` de `data.sql` avec les relations présentes après `schema.sql`,
puis rejoue `data.sql` dans une session séparée avec
`session_replication_role = replica` pour éviter l'exécution des triggers pendant
le chargement des données. Des fixtures synthétiques positive et négative
vérifient respectivement une relation présente, une relation absente et
l'absence préalable des extensions ; la fixture positive est supprimée et son
absence est vérifiée avant le rejeu réel. Le contrôle final relie ses assertions
de contraintes, grants et RLS aux relations métier exportées dans `public`,
couvre les relations exportées des deux schémas pour la cohérence et les
contraintes, exclut les objets possédés par une extension et vérifie les index
spatiaux et trigrammes. Il vérifie aussi les fonctions publiques, au moins cinq
fonctions `private` et les policies `public` qui dépendent de fonctions
`private`, ainsi que les extensions et rôles. Ainsi,
une fixture résiduelle ou un objet Supabase géré ne peut pas satisfaire seul les
assertions métier.

Le workflow séparé de preuve reconstruit une base source avec les migrations et
le seed canoniques, ajoute uniquement une fixture synthétique versionnée, produit
les trois dumps avec les mêmes options (`--schema public,private` pour les
dumps schéma et données) que le backup, puis appelle le même
exécuteur dans une seconde cible Supabase éphémère. Il contrôle les données,
contraintes, index spatiaux et trigrammes, fonctions, RLS, grants, extensions,
rôles et les cas négatifs. Le workflow de backup appelle ce même exécuteur avec
les dumps liés et sans attente artificielle de la fixture source. Cette preuve
ne contacte pas Production et ne publie aucun diagnostic en clair.
La configuration canonique `apps/web/supabase/config.toml` et l'arbre de
migrations ne sont pas modifiés ; une base vierge créée par `createdb` n'est pas
une cible Supabase représentative.

Recréer ensuite les buckets et téléverser les octets Storage avec l'API officielle,
en contrôlant chemin, taille, MIME et SHA-256. Reconstituer Auth par un mécanisme
Supabase officiellement supporté et autorisé ; il n'est pas fourni par ce dump.
Valider séparément les clients Web/mobile, RPC, RLS et flux critiques.

### Vérification Windows avec Kleopatra

Après téléchargement de l'artefact privé, importer la clé privée correspondante
dans Kleopatra uniquement sur le poste sécurisé. Vérifier ensuite l'empreinte du
fichier de clé et du destinataire attendu ; ne jamais importer une clé privée dans
GitHub Actions.

Dans Kleopatra, choisir `Decrypt/Verify` sur l'archive `.tar.gpg` et sélectionner
un dossier local protégé pour produire l'archive `.tar`. Vérifier son empreinte
avec PowerShell, par exemple :

```powershell
Get-FileHash .\supabase-backup-<run>.tar.gpg -Algorithm SHA256
Get-Content .\supabase-backup-<run>.sha256
```

Comparer les valeurs avant extraction, puis ouvrir l'archive avec 7-Zip ou
`tar -xf` dans un dossier local chiffré. Le tar déchiffré et les dumps SQL ne
doivent être téléversés, commités ou publiés. Cette procédure locale ne constitue
pas à elle seule la preuve d'un run de backup réussi.

## PLAN : sauvegardes autonomes et reprise après sinistre

### 1. Objectif et périmètre

CleanMyMap doit conserver la capacité de récupérer ses données et de remettre le produit en service après :

- une indisponibilité temporaire ou définitive de Supabase ;
- une suppression accidentelle ou une corruption de données ;
- une compromission du site, du backend ou des accès administratifs ;
- une compromission d'un fournisseur, du dépôt GitHub ou des identifiants de déploiement.

Trois capacités distinctes sont nécessaires :

1. **Sauvegarder** : produire et conserver une archive complète, intègre et chiffrée, indépendamment de la réussite d'un test de restauration.
2. **Restaurer** : démontrer que les archives permettent de reconstruire les données et leurs contrats SQL sur une cible isolée.
3. **Remettre en service** : rétablir une application Web/mobile fonctionnelle sur une infrastructure saine, y compris hors Supabase si nécessaire.

Ces trois capacités doivent partager un format de sauvegarde documenté, mais leurs échecs et leurs validations restent indépendants.

### 2. Couverture exigée

Le périmètre de sauvegarde doit comprendre :

| Ressource            | Contrat                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL `public`  | Tables, données, vues, séquences, fonctions, triggers, contraintes, index, RLS et grants                                  |
| PostgreSQL `private` | Fonctions, permissions, objets et éventuelles données applicatives                                                        |
| Rôles                | Définition et informations nécessaires à la réconciliation des rôles sur la cible, sans réutilisation aveugle des secrets |
| Extensions           | Inventaire des extensions et versions, notamment PostGIS, `pg_trgm`, `pgcrypto` et `uuid-ossp`                            |
| Supabase Storage     | Buckets, objets, contenus binaires, métadonnées utiles et empreintes SHA-256                                              |
| Migrations           | Inventaire des versions réellement appliquées, associé au SHA Git                                                         |
| Configuration        | Inventaire des paramètres indispensables à la reconstruction, sans intégrer de secrets en clair                           |
| Dépendances externes | Inventaire des contrats Clerk, Vercel, DNS et services nécessaires au fonctionnement                                      |

Le schéma `private` est applicatif : il contient des fonctions consommées par des policies RLS de `public`. L'export limité à `public` est donc insuffisant.

Les schémas gérés par Supabase (`auth`, `storage`, etc.) ne doivent pas être assimilés aux schémas applicatifs. Leur couverture et leur reconstruction nécessitent des procédures distinctes et explicitement vérifiées.

Clerk demeure la source d'identité canonique. Une sauvegarde PostgreSQL ne garantit pas à elle seule la récupération des comptes, sessions ou paramètres Clerk.

### 3. Sauvegarde indépendante

**Cible :** un workflow automatique mensuel, activable explicitement, en lecture seule sur Production, qui :

1. Vérifie les accès, la clé publique GPG et le périmètre attendu.
2. Exporte les données et les objets Storage sans mutation de Production.
3. Vérifie que les fichiers et inventaires attendus sont présents et cohérents.
4. Construit un manifeste versionné contenant périmètre, horodatage, versions, SHA Git et empreintes.
5. Chiffre l'archive avant toute publication.
6. Publie l'archive chiffrée et son `.sha256` dans un bucket Cloudflare R2 privé via son API S3, puis récupère l'archive pour vérifier exactement son SHA-256.
7. Publie uniquement les statuts et métadonnées non sensibles.

Le workflow de sauvegarde ne dépend pas de la réussite du restore-check PostgreSQL. Un échec d'export, une couverture incomplète, une erreur de manifeste, un chiffrement défaillant, un transfert R2, une collision ou une récupération dont le SHA diverge restent bloquants. Un restore-check échoué est conservé comme `RESTORE_FAILED` et ne bloque pas l'archive si elle est par ailleurs intègre.

**Une archive intègre mais non restaurée ou dont le rejeu échoue peut être conservée, mais son statut doit explicitement indiquer `RESTORE_FAILED` (ou `RESTORE_UNVERIFIED` si aucun rejeu n'a pu commencer).**

Aucun SQL, objet Storage, secret ou fichier déchiffré ne doit être publié dans les logs, les artefacts publics ou les caches.

### 4. Stockage et conservation

Les archives doivent être conservées hors de Supabase, dans un stockage privé utilisant une frontière administrative indépendante.

**Politique cible initiale :**

- une sauvegarde mensuelle, activée par `SUPABASE_BACKUP_MONTHLY_ENABLED=true` ;
- conservation pérenne des archives et de leurs `.sha256` dans le bucket R2 privé ;
- règles de rétention, verrouillage et éventuelle immutabilité configurés hors de GitHub Actions ;
- aucune capacité CI de suppression, de listing global ou de modification des règles de rétention R2 ;
- au moins une copie supplémentaire sous une autre frontière d'accès lorsque la politique d'exploitation le permet.

Cette politique reste à ajuster selon la volumétrie réelle, les coûts, le RGPD et la sensibilité des données.

L'identité qui produit et téléverse les archives doit avoir les permissions minimales nécessaires. Elle ne doit pas pouvoir effacer l'ensemble de l'historique de sauvegardes.

La clé privée GPG et sa phrase secrète restent hors CI et hors GitHub. Elles doivent être récupérables après une panne ou une perte du poste principal, avec une copie sécurisée indépendante.

La rétention GitHub Actions de trois jours actuellement configurée ne satisfait pas cette cible ; elle reste seulement une copie courte de dépannage. R2 est la conservation pérenne attendue.

### 5. Restauration vérifiée

La restauration doit utiliser une archive existante et une cible nouvelle, isolée de Production.

Procédure attendue :

1. Vérifier l'empreinte SHA-256, le manifeste et le destinataire GPG.
2. Déchiffrer dans un environnement autorisé et protégé.
3. Créer une cible PostgreSQL/Supabase compatible.
4. Préparer les schémas gérés nécessaires, rôles et extensions.
5. Restaurer les schémas métier `public` et `private`, puis les données dans l'ordre adapté.
6. Restaurer séparément les buckets et fichiers Storage.
7. Contrôler les relations, volumes, contraintes, index, fonctions, triggers, RLS, policies et grants.
8. Tester les parcours applicatifs critiques Web et Mobile avec plusieurs niveaux d'autorisation.
9. Nettoyer les fichiers temporaires et documenter le résultat.

Une restauration PostgreSQL seule ne prouve pas une remise en service complète.

**Fréquence cible :** exécuter les preuves de restauration après toute modification significative des contrats de données, ainsi qu'un exercice périodique sur une archive réellement conservée.

Les tests doivent vérifier les échecs attendus sans désactiver la RLS ni affaiblir les règles d'autorisation pour obtenir un résultat positif.

### 6. Scénarios de reprise après sinistre

#### A. Application ou accès administratifs compromis

1. Isoler le système compromis et suspendre les écritures à risque.
2. Préserver les preuves utiles à l'investigation.
3. Déterminer la fenêtre probable de compromission.
4. Identifier une sauvegarde antérieure à la compromission, sans considérer automatiquement la dernière comme saine.
5. Provisionner une infrastructure de récupération isolée.
6. Restaurer et vérifier les données.
7. Révoquer ou renouveler les identifiants et clés compromis : Supabase, Clerk, Vercel, GitHub, Storage et autres services concernés.
8. Redéployer depuis une révision de code vérifiée.
9. Contrôler les autorisations, journaux, accès administrateurs et fonctionnalités sensibles.
10. Réouvrir progressivement les services uniquement après validation.

Ne jamais écraser directement Production avec une archive potentiellement compromise.

#### B. Supabase définitivement indisponible

1. Récupérer les archives et les éléments de reconstruction sans dépendre de l'accès à Supabase.
2. Préparer une infrastructure PostgreSQL indépendante.
3. Restaurer les objets métier, données et extensions compatibles.
4. Reconstruire les services nécessaires : API, Storage, autorisation et autres fonctions de plateforme effectivement consommées.
5. Rétablir les connexions Clerk, les secrets applicatifs, les variables d'environnement et les domaines.
6. Déployer les applications Web et Mobile compatibles.
7. Vérifier les parcours critiques et les permissions avant toute bascule de trafic.

**Limite :** la restauration des données PostgreSQL ne remplace pas automatiquement les services managés Supabase. La sortie complète du fournisseur demande une validation distincte.

### 7. États et preuves

| État                         | Critère d'attribution                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `BACKUP_FAILED`              | Export, intégrité, chiffrement ou conservation défaillant                          |
| `BACKUP_CREATED`             | Archive chiffrée et `.sha256` présents dans R2 après récupération et SHA-256 exact |
| `RESTORE_UNVERIFIED`         | Archive conservée sans preuve de restauration réussie                              |
| `RESTORE_FAILED`             | Exercice réel échoué, cause enregistrée sans fuite de données                      |
| `RESTORE_VERIFIED`           | Archive restaurée sur cible isolée, contrôles SQL et données exécutés avec succès  |
| `DISASTER_RECOVERY_VERIFIED` | Exercice de remise en service applicative exécuté avec succès                      |

Chaque preuve doit être liée à un identifiant d'archive, un SHA Git, un horodatage, un environnement de test et un résultat vérifiable.

Un test réussi sur une fixture synthétique ne vaut pas restauration d'une archive Production. Un artefact produit ne vaut pas validation de sa restaurabilité.

### 8. Objectifs de continuité

La fréquence mensuelle vise une archive pérenne par mois en fonctionnement nominal, mais cette garantie n'existe que si l'activation du cron, le transfert R2 et la récupération avec SHA-256 exact réussissent.

Le **RPO** (perte maximale de données admissible) et le **RTO** (délai maximal de reprise admissible) doivent être fixés à partir du besoin métier et mesurés au moyen d'exercices. Aucun RPO ou RTO garanti n'est actuellement démontré.

### 9. Conditions de validation du plan

La stratégie sera considérée opérationnelle uniquement lorsque :

- le périmètre applicatif `public` et `private` est couvert et vérifié ;
- une archive Production complète a été chiffrée et conservée hors Supabase ;
- plusieurs versions historiques sont récupérables ;
- un déchiffrement réel a été effectué avec la clé privée ;
- une archive a été restaurée sur une cible isolée avec contrôles de données et d'autorisations ;
- un exercice de reprise applicative a été réalisé ;
- les responsabilités, procédures d'urgence, limites et résultats sont documentés.

Les procédures existantes `CURRENT` restent applicables tant que ces objectifs `PLAN` ne sont pas effectivement implémentés et validés.

### Références

- [Supabase : Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase : Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase : Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
- [Supabase : Download Storage Objects](https://supabase.com/docs/guides/storage/management/download-objects)

## Rotation et incident

Pour une rotation, vérifier la nouvelle clé publique hors CI, la remplacer dans
le secret protégé, exécuter un backup manuel, puis déchiffrer localement avec la
nouvelle clé avant de retirer l'ancienne. Conserver l'ancienne clé uniquement
jusqu'à cette preuve.

En incident, récupérer la dernière archive chiffrée encore dans R2 (ou dans la
rétention GitHub de secours), vérifier son SHA-256 et son empreinte, la déchiffrer localement, puis
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
