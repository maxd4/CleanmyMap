# Vendor Exit Strategy : continuité et sortie des fournisseurs

Statut documentaire : `CURRENT` pour l'inventaire des contrats existants et les règles de gouvernance ; `PLAN` pour les capacités de sauvegarde, restauration et bascule qui ne sont pas encore démontrées.

## 1. Objectif, autorité et limites

CleanMyMap doit pouvoir récupérer ses **données, identités, fichiers et code**, puis rétablir un service Web et mobile sain si un fournisseur devient indisponible, supprime des données, change ses conditions ou subit une compromission. L'objectif n'est pas de supprimer préventivement les services managés, mais de conserver une voie de sortie **documentée, réversible lorsque possible et réellement testée**.

Ce document est l'**owner canonique de la stratégie transversale de sortie des fournisseurs** : responsabilités, priorités, frontières de données, dépendances entre fournisseurs, scénarios de bascule et critères de preuve. Il ne remplace pas :

- [Sauvegarde et restauration Supabase](./supabase-backup-restore.md), owner de la procédure PostgreSQL, Storage, GPG et restore-check ;
- [Configuration des environnements](./environment-configuration.md), owner des variables et des frontières Production/Preview/Development/Expo ;
- [Services Web Stack](./services-stack.md), registre des intégrations et de leurs conditions de configuration ;
- [Configuration e-mail](./email-setup.md), owner du domaine d'envoi et de la réception ;
- [ADR-001 : authentification Clerk](../architecture/adr/ADR-001-clerk-auth.md) et [ADR-004 : identité mobile](../architecture/adr/ADR-004-companion-identity.md), owners du contrat d'identité et des JWT.

Une présence dans le code, une variable déclarée ou une sonde `ready` ne démontrent pas que le service est actif en Production. Les qualificatifs `CURRENT` ci-dessous décrivent des **contrats versionnés**, pas une disponibilité fournisseur vérifiée en temps réel. Aucune migration vers un fournisseur de secours n'est déclarée opérationnelle sans exercice exécuté.

### Invariants de reprise

1. Les copies de secours ne doivent dépendre ni de l'accès au compte fournisseur sinistré, ni des mêmes identifiants administratifs que la Production.
2. Les données sensibles restent chiffrées hors Production ; les clés privées de déchiffrement ne sont jamais stockées dans Git, GitHub Actions ou le runtime applicatif.
3. Les anciennes sauvegardes doivent être protégées contre l'écrasement, la suppression et la propagation d'une corruption ou d'un rançongiciel.
4. Les identités, propriétés de ressources, niveaux de rôle et restrictions RLS doivent rester corrects après migration. Une correspondance par e-mail ou un nouveau JWT ne confère jamais automatiquement l'accès à un ancien compte.
5. Toute restauration s'effectue d'abord sur une cible isolée. Pas de `db reset`, de `db push`, de restauration destructive ou de changement de DNS sur Production pour tester une hypothèse.
6. L'intégrité de l'archive, la restaurabilité des données et la remise en service du produit sont des preuves **distinctes**.
7. Les opérations de collecte/export respectent RGPD, minimisation, droits d'accès, durées de conservation et obligations de suppression. Une sauvegarde chiffrée n'est pas une dispense de gouvernance des données.
8. Web (`apps/web`) et Mobile (`apps/mobile`) restent deux runtimes du **même produit** et consomment les mêmes contrats métier. Une migration ne doit pas créer une seconde identité ou une deuxième base métier concurrente.

## 2. Cartographie des dépendances

### 2.1 Frontières réelles

```text
GitHub (code, migrations, configuration versionnée)
       |
       +--> apps/web (Next.js) --> Vercel (hébergement, fonctions, cron, variables)
       |                         |
       |                         +--> Clerk (comptes, sessions, JWT)
       |                         +--> Supabase (PostgreSQL, RLS, Storage, API)
       |                         +--> Resend (envoi des e-mails)
       |
       +--> apps/mobile (Expo/React Native, développement)
                                 +--> Clerk (même identité)
                                 +--> Supabase (mêmes données et autorisations)

Domaine/DNS et réception e-mail : opérateurs distincts du code et de la base.
Autres intégrations : voir le registre services-stack.md.
```

Les informations applicatives **ne résident pas toutes dans Supabase**. Clerk est l'autorité d'authentification ; des informations de compte et de connexion sont gérées chez Clerk, tandis que des profils et références aux identifiants Clerk existent dans Supabase. Vercel détient des paramètres de déploiement et des secrets d'exécution ; Resend gère des événements liés aux envois. GitHub détient l'historique du code et des migrations. Chacun exige un plan de récupération adapté.

### 2.2 Matrice de reprise

| Fournisseur / surface | Dépendance `CURRENT` dans le dépôt | Données et éléments à préserver (`PLAN`) | Solution de sortie et risque |
| --- | --- | --- | --- |
| **Supabase**, critique | PostgreSQL, schémas métier, RLS, fonctions/RPC, Storage, API et accès serveur/client | `public`, `private`, données, relations, fonctions, policies, grants, migrations appliquées, extension/version, buckets, octets et métadonnées Storage | Nouveau projet Supabase : migration ciblée ; PostgreSQL indépendant : reconstituer aussi API, Storage et vérification JWT. Risque élevé hors Supabase |
| **Clerk**, critique | Identité canonique Web/Mobile, tokens transmis à Supabase, métadonnées et synchronisation de profils | Export chiffré des utilisateurs, identifiants, méthodes de connexion, métadonnées pertinentes et relations d'ownership ; exports d'empreintes de mots de passe si autorisés et compatibles | Nouveau fournisseur Auth : migration d'identité, de JWT, de sessions et de RLS. Risque élevé |
| **Vercel**, critique pour le Web | Hébergement Next.js, fonctions serveur, réglages d'environnement, cron et déploiement | Inventaire des variables par environnement, secrets exportables de manière sûre, domaines, protections, cron, configuration et procédure de déploiement | Hébergement Node.js/Docker compatible Next.js. Risque moyen, dépendant des fonctions et services périphériques |
| **GitHub**, critique pour le code | Monorepo, historique, migrations, CI et release | Copie miroir indépendante du dépôt, tags et références nécessaires ; inventaire des secrets/variables Actions **sans recopier leurs valeurs en Git** | Hébergeur Git alternatif ; réinstaller la CI et les secrets. Sans copie indépendante, perte de source critique |
| **Resend**, fonctionnellement optionnel mais nécessaire aux envois concernés | Service centralisé d'e-mail transactionnel dans `apps/web/src/lib/services/email.ts` | Configuration d'envoi, identifiants de messages utiles, contacts si utilisés, désinscriptions, suppressions et événements nécessaires | Autre service e-mail API/SMTP ; nouvelles clés et SPF/DKIM/DMARC. Risque faible à moyen, mais les e-mails déjà envoyés ne se recréent pas |
| **Domaine, DNS, réception** | Domaine, DNS et redirection e-mail décrits dans `email-setup.md` | Preuve de contrôle du domaine, zone DNS, MX/SPF/DKIM/DMARC, contacts de récupération, configuration de boîte ou redirection | Autre opérateur DNS ou de messagerie ; conserver le contrôle du domaine. La configuration documentée ne prouve pas l'état DNS réel |
| **Expo/EAS et stores** | Build/distribution Mobile et variables distinctes de Vercel ; app encore `NOT_PRODUCTION_READY` | Configuration EAS, identifiants natifs, certificats/clefs de signature sous garde appropriée, configurations de publication, versions distribuées | Reproduire build/signature/distribution sans perdre l'identité de l'application. Délais et procédures de stores externes |
| **Upstash Redis / QStash** | Intégrations distinctes, conditionnelles | Déterminer si une donnée est transitoire, un cache, une limite de débit ou une tâche durable avant de décider de son export | Redis/queue équivalente ; ne pas réimporter aveuglément un cache ou de vieux jobs |
| **Stripe** | Checkout et webhooks présents dans le backend, parcours Funding non déclaré ouvert en Production | Inventorier données financières légalement nécessaires, configuration et identifiants métier ; ne jamais archiver des données bancaires interdites | Changement de prestataire avec conformité, rapprochement et contrats de paiement à vérifier séparément |
| **PostHog / Sentry** | Analytics sous consentement et observabilité, selon configuration | Exports utiles selon finalité, consentement, rétention et obligations ; configuration des alertes | Fournisseurs alternatifs ; perte d'historique de diagnostics possible sans export |
| **Cloudflare / Uptime Robot / Pinecone** | Déclarations/intégrations de nature différente ; usage réel à vérifier | DNS/protection/supervision ou index dérivés selon le cas ; ne pas présumer de données métier canoniques | Reconfigurer les fonctions réellement consommées ; ne pas sauvegarder des index reproductibles comme s'ils étaient canoniques |

Le périmètre exact des exports, les droits d'accès, les possibilités de récupération des secrets et les quotas dépendent des offres et de leur état au moment de l'exercice. Ces points doivent être testés, pas présumés.

## 3. `CURRENT` : capacités disponibles et limites

### 3.1 Base Supabase

L'arbre canonique des migrations est `apps/web/supabase/migrations/`. Les deux workflows `.github/workflows/supabase-backup.yml` et `.github/workflows/supabase-backup-restore-proof.yml` consomment un exécuteur de restauration commun : `scripts/ci/run-supabase-restore-check.sh`.

Le workflow de sauvegarde est **manuel**, exporte actuellement le schéma `public` uniquement avec la CLI Supabase, les rôles et les objets Storage, puis prépare une archive GPG après vérification du replay PostgreSQL. Un échec de restauration empêche actuellement la publication de l'archive. La rétention de l'artefact GitHub est de **trois jours**.

Ce périmètre ne constitue **pas** une reprise après sinistre démontrée. Le schéma applicatif `private` est créé par les migrations et contient des fonctions utilisées par des policies de `public` : il n'est pas couvert par les dumps `--schema public`. Les schémas et services gérés `auth`, `storage` et apparentés ne sont pas reconstruits par ce seul export. Leurs données ou paramètres spécifiques ne doivent pas être déclarés sauvegardés sans preuve.

Consulter exclusivement [la procédure canonique Supabase](./supabase-backup-restore.md) pour l'état des étapes, secrets protégés, limites et vérifications de restauration.

### 3.2 Authentification et identifiants

Clerk reste l'unique fournisseur d'identité canonique pour Web et Mobile. Les clients Supabase utilisent les jetons Clerk ; les permissions RLS de plusieurs tables reposent sur le claim `sub` de ce jeton. Les données métier référencent aussi ces identifiants.

**Une copie des tables Supabase ne recrée donc ni les utilisateurs Clerk, ni leurs sessions, ni leurs méthodes de connexion.** Un nouvel identifiant généré par un autre fournisseur ne doit jamais être assimilé automatiquement à l'ancien. Il faut une correspondance vérifiée et une migration contrôlée des consommateurs, politiques et références de compte.

### 3.3 Code, hébergement et courrier

Le code source Next.js est versionné dans GitHub et non uniquement sur Vercel. `apps/web/vercel.json` porte notamment la région, des règles de réécriture et un cron ; les variables d'environnement restent gérées séparément. La possibilité de démarrer Next.js ailleurs ne prouve pas que toutes les fonctions, tâches cron, caches, accès fournisseurs et domaines y sont opérationnels.

L'envoi des e-mails passe par un service centralisé. En l'absence de configuration Resend, le code contient un mode de simulation : `mocked` **n'est jamais une preuve d'envoi**. Les événements applicatifs d'e-mail et l'historique conservé chez Resend ne sont pas des copies identiques.

Les scripts suivants existent dans le workspace Web et constituent des points d'appui, **pas** des preuves de sauvegarde inter-fournisseurs complète :

| Besoin | Commande versionnée / owner |
| --- | --- |
| Export de données Supabase historique | `npm run data:archive:supabase -w apps/web` |
| Export/restauration de l'état `actions`, périmètre fonctionnel spécifique | `npm run backup:actions -w apps/web` et `npm run restore:actions -w apps/web` |
| Convergence des migrations canonique | `npm run supabase:migration:preflight -- --dry-run` puis processus autorisé distinct |
| Outil de gestion des previews Supabase | `npm run backend:supabase:preview:ensure -w apps/web` |
| Synchronisation de configuration Vercel | `npm run backend:vercel:env:sync -w apps/web`, à utiliser uniquement avec les permissions et cibles adéquates |
| Vérifications de release / métriques | `npm run pre-release:check` ; `npm run metrics:cicd` |

Ne pas confondre les exports métier partiels avec la sauvegarde PostgreSQL/Storage, ni réutiliser un outil de synchronisation des variables comme coffre de secrets.

## 4. `PLAN` : sauvegardes autonomes et conservation

### 4.1 Contrat commun

La sauvegarde doit pouvoir être produite **même si le banc d'essai de restauration échoue**. Les actions sont séparées :

1. **Exporter** le périmètre métier complet, vérifier les inventaires et empreintes, produire un manifeste avec horodatage, identifiant d'archive, provenance, versions et SHA Git.
2. **Chiffrer** l'archive avant de quitter l'espace protégé, vérifier le destinataire GPG et l'intégrité du fichier final.
3. **Conserver** l'archive dans un stockage privé indépendant de Supabase, idéalement protégé contre suppression/modification par le compte qui l'écrit.
4. **Restaurer et tester** une archive conservée dans une cible isolée, sans bloquer rétroactivement sa conservation si le test échoue.
5. **Qualifier** séparément l'intégrité du backup, la restaurabilité de la base et la reprise applicative.

Un export incomplet, un manifeste incorrect, un chiffrement défaillant ou un transfert non confirmé restent bloquants pour `BACKUP_CREATED`. En revanche, une archive complète et chiffrée peut être conservée sous `RESTORE_UNVERIFIED` si la validation PostgreSQL échoue. Aucun statut `RESTORE_VERIFIED` ne peut être attribué sur tests statiques ou fixtures uniquement.

### 4.2 Stockage, rétention et sécurité

Politique initiale proposée, à ajuster après mesure de volumétrie, coût et obligations RGPD : **quotidien**, au moins **30 versions journalières**, **12 versions hebdomadaires**, et une **copie indépendante** sous une autre frontière d'accès. Protéger les versions contre écrasement et suppression pendant la fenêtre retenue. Documenter les expirations, demandes d'effacement, clés de chiffrement, restaurations et suppressions autorisées.

La clé privée GPG et sa récupération de secours restent hors GitHub et hors du fournisseur de stockage des archives. Une copie locale seule n'est pas suffisante si le poste est perdu. Les informations de récupération du coffre de secrets et du domaine doivent être conservées dans une procédure protégée hors dépôt, sans jamais placer de valeurs sensibles dans ce document.

Ne pas confondre « indépendant de Supabase » avec « indépendant de toute compromission » : une archive GitHub Actions et les secrets GitHub peuvent partager le même domaine d'administration qu'un attaquant contrôlant le dépôt. Préférer des identités de sauvegarde aux droits minimaux, sans pouvoir de suppression sur les anciennes versions.

### 4.3 Sauvegardes par autorité

- **Supabase :** couvrir `public` **et** `private`, données, fonctions, RLS, grants, extensions nécessaires, inventaire des migrations et octets Storage. Le mécanisme précis reste défini dans [supabase-backup-restore.md](./supabase-backup-restore.md).
- **Clerk :** effectuer des exports sécurisés et autorisés d'identités, e-mails, identifiants et métadonnées utiles ; documenter séparément la disponibilité et la portabilité des empreintes de mots de passe. Les tokens actifs, facteurs MFA et liens sociaux ne sont pas présumés exportables/restaurables. Protéger particulièrement ces données à haut risque.
- **Vercel :** inventorier et exporter hors Git les paramètres récupérables par environnement, les domaines, cron, protections et intégrations. Les secrets non récupérables doivent être recréés depuis un coffre externe ou renouvelés.
- **Resend :** exporter, si utilisés, contacts, statuts de désinscription/suppression, configurations de domaine et historiques strictement nécessaires. Préserver les interdictions d'envoi après migration. Ne pas archiver inutilement les contenus de messages.
- **GitHub :** conserver une copie Git indépendante avec l'historique utile et les migrations ; documenter séparément les paramètres CI et recréer les secrets hors Git.
- **DNS / Expo / autres :** inventorier les configurations et données non reconstituables, puis déterminer une fréquence proportionnée à leur criticité. Un service seulement déclaré dans un registre ne justifie pas automatiquement un nouveau backup.

Les exports de plusieurs fournisseurs sont des instantanés à dates différentes. Leur cohérence inter-systèmes, notamment les identifiants Clerk référencés en base, doit être contrôlée avant bascule.

## 5. `PLAN` : stratégies de restauration et de bascule

### 5.1 Supabase perdu, nouveau projet Supabase disponible

C'est la voie de reprise à privilégier pour limiter le changement logiciel :

1. Récupérer les archives et le code depuis les copies indépendantes ; sélectionner un point de restauration sain.
2. Créer un **nouveau projet isolé** et y reconstituer les dépendances PostgreSQL/Supabase requises.
3. Restaurer schémas applicatifs, données, Storage et contrôles de permissions ; vérifier relations, comptages significatifs, fonctions, triggers, RLS, grants et extensions.
4. Reconfigurer l'intégration Clerk/JWT et les secrets du backend sur cette cible, sans introduire d'identité anonyme ou d'escalade de droits.
5. Changer les URL et clés Supabase dans Vercel et les configurations Mobile concernées. Les variables embarquées dans un build Expo peuvent nécessiter un nouveau build ou une mise à jour validée ; ne pas présumer d'un basculement immédiat pour les applications installées.
6. Tester les flux Web/Mobile et les droits propriétaire, tiers, anonyme et administrateur sur la cible avant de rétablir les écritures et le trafic.

Le code métier n'a pas vocation à être réécrit entièrement, **si** les interfaces, schémas, JWT et services du nouveau projet sont compatibles. Cela reste une hypothèse à valider en exercice.

### 5.2 Supabase définitivement indisponible, hébergement PostgreSQL tiers

La restauration des fichiers SQL ne suffit pas à exploiter le produit. Il faut également fournir les interfaces réellement utilisées : API compatible avec les appels `supabase-js`/PostgREST et RPC, gestion des jetons Clerk, RLS, Storage, URL signées, jobs et intégrations serveur. Vérifier la compatibilité PostGIS, extensions, propriétaires, privilèges et fonctions qui utilisent des schémas gérés Supabase.

**Décision :** ne pas préparer aujourd'hui une deuxième plateforme métier complète en parallèle. Conserver les dumps et la documentation nécessaires, puis réaliser un exercice ciblé de migration sur infrastructure neutre pour établir précisément l'adaptation de code requise. Aucun délai de reprise n'est prouvé.

### 5.3 Vercel indisponible

Redéployer `apps/web` depuis une copie saine du dépôt vers un hébergeur Node.js ou Docker compatible Next.js. Recréer les variables d'environnement depuis une source indépendante, les tâches cron, les domaines/DNS, HTTPS, protections, éventuels caches et mécanismes de supervision. Préserver Supabase et Clerk si ces services fonctionnent. Tester les routes API et tâches programmées ; un build réussi seul ne constitue pas une reprise.

### 5.4 Clerk indisponible ou compromis

Recouvrer les exports sécurisés de comptes et métadonnées. Choisir un fournisseur d'identité compatible avec les contraintes réelles Web/Mobile et les méthodes d'authentification. Étudier la portabilité des empreintes de mots de passe au cas par cas ; prévoir réauthentification, réinscription OAuth ou réinitialisation lorsque nécessaire. Ne jamais réutiliser de sessions ou secrets compromis.

La reprise des données historiques exige une **correspondance vérifiée et traçable** entre ancien identifiant Clerk et nouvelle identité. Les tables métier, ownership, JWT `sub`, RLS, webhooks et synchronisations devront être adaptés ou réconciliés de façon cohérente. Ne jamais réaffecter un compte uniquement parce que deux adresses e-mail correspondent. Une identité métier abstraite future ne doit être introduite qu'après analyse de tous les consommateurs et migrations, pas comme modification préventive de convenance.

### 5.5 Resend indisponible

Remplacer le prestataire derrière le service e-mail centralisé, reconfigurer les clés serveur et vérifier SPF, DKIM, DMARC et le domaine d'envoi. Restaurer les suppressions/désinscriptions pertinentes avant tout envoi de masse. Tester envoi réel, réception, erreur et anti-abus. La réception décrite via LWS/Gmail est une frontière distincte. Ne pas transformer un retour applicatif `mocked` en succès de livraison.

### 5.6 Compromission simultanée ou fournisseur compromis

1. **Isoler** le composant et suspendre les écritures susceptibles d'aggraver la compromission ; préserver les éléments utiles à l'investigation.
2. **Qualifier** l'étendue, la période et les identifiants exposés ; ne pas considérer automatiquement la dernière archive comme saine.
3. **Choisir** un état antérieur vérifiable et une infrastructure neuve, sans utiliser les anciennes sessions ou clés suspectes.
4. **Reconstruire et restaurer** les données, les comptes et les services nécessaires sur des frontières propres ; tester RLS, droits et flux sensibles.
5. **Renouveler/révoquer** les clés et accès affectés, y compris CI, DNS, fournisseurs, webhooks, comptes de service et jetons applicatifs.
6. **Valider** sécurité, intégrité et fonctionnement avant bascule DNS/clients ; traiter les éventuelles obligations légales et notifications de violation de données selon les constats.
7. **Observer** les systèmes rétablis et conserver une piste d'audit de l'incident.

Pas de restauration directe dans la Production suspecte ; pas de réplication aveugle des contenus potentiellement corrompus.

## 6. Mesures, preuves et critères de réussite

| État / preuve | Signification | Ce qui ne suffit pas |
| --- | --- | --- |
| `BACKUP_CREATED` | Archive chiffrée, complète pour son périmètre déclaré, empreinte/manifeste validés et stockage confirmé | Dump produit seulement dans le runner |
| `RESTORE_UNVERIFIED` | Archive conservée sans replay complet prouvé | Succès des tests Node ou du chiffrement |
| `RESTORE_FAILED` | Exercice réel échoué ; cause conservée dans un diagnostic sécurisé | Simple classification SQLSTATE sans cause établie |
| `RESTORE_VERIFIED` | Archive réelle restaurée sur cible isolée et contrôles SQL, données et accès exécutés | Fixture synthétique seule ou présence des tables |
| `SERVICE_RECOVERY_VERIFIED` | Parcours applicatifs Web/Mobile pertinents, identité et accès rétablis sur infrastructure de secours | Build Next.js vert ou connexion DB seule |
| `VENDOR_EXIT_VERIFIED` | Exercice de changement de fournisseur réalisé, dépendances résiduelles et limites documentées | Architecture écrite sans migration de test |

Chaque preuve doit préciser l'identifiant d'archive, sa date, le périmètre couvert, le SHA Git, le type de cible, les tests réellement exécutés et les exceptions. Un test CI sur données synthétiques ne prouve pas la restauration d'une archive de Production.

Le **RPO** (perte maximale de données acceptable) et le **RTO** (durée maximale de reprise) ne sont **pas établis** à ce stade. Une fréquence quotidienne proposée ne garantit pas un RPO de 24 heures si des exécutions échouent. Les fixer après analyse métier et exercice chronométré ; suivre ensuite les écarts mesurés, sans inventer de délai.

### Exercices minimums (`PLAN`)

- Restaurer une archive GPG réelle avec la clé privée disponible hors CI, sur une cible isolée, sans altérer Production.
- Comparer les invariants métier et permissions après restauration, y compris les fonctions de `private` utilisées par les policies de `public`.
- Rejouer un déploiement Web hors Vercel en conservant les autres fournisseurs, puis vérifier les routes, cron et paramètres de sécurité.
- Tester l'export et le réimport contrôlé d'identités Clerk dans un environnement de test distinct, avec identifiants synthétiques et couverture des RLS ; aucun compte réel ne doit être modifié pour cette preuve.
- Simuler une panne Resend avec prestataire de test, maintien des suppressions et e-mail réellement reçu.
- Tester l'accès à une copie historique quand le compte du fournisseur principal et le compte d'écriture des backups ne sont plus disponibles.

## 7. Ordre des chantiers et conditions d'arrêt

Les étapes ci-dessous sont des décisions `PLAN`, non des tâches lancées ni des engagements de calendrier.

| Priorité | Chantier borné | Critère de clôture |
| --- | --- | --- |
| **P0** | Rendre l'export Supabase complet pour `public` et `private`, séparer sauvegarde chiffrée et restore-check, conserver au moins une archive récupérable indépendamment du résultat de la preuve SQL | Archive réelle chiffrée avec manifeste conforme, hors runner ; `RESTORE_UNVERIFIED` explicite si replay non validé |
| **P1** | Stockage externe versionné, conservation et récupération de la clé GPG hors dépendance GitHub/Supabase | Une archive historique récupérée et déchiffrée depuis la copie indépendante ; droits de suppression testés |
| **P1** | Export et procédure de migration d'identités Clerk, inventaire des secrets Vercel et copie indépendante Git | Exports sécurisés, contrôle de couverture et reconstruction de test sans accès aux comptes Production |
| **P2** | Restauration d'une archive réelle sur nouveau projet Supabase, puis tests RLS/Storage et parcours critiques | `RESTORE_VERIFIED` et `SERVICE_RECOVERY_VERIFIED` sur une cible isolée |
| **P2** | Redéploiement Web hors Vercel et remplacement contrôlé de Resend | Services testés avec clés neuves et vérifications de réception, sécurité et cron |
| **P3** | Exercice de bascule hors Supabase / changement de fournisseur d'identité | Contrats API, JWT, ownership et fonctionnement mesurés ; écarts documentés |

**STOP CONDITION globale :** disposer de copies indépendantes récupérables des données et identités critiques, d'un exercice réellement exécuté sur archive conservée, d'un chemin de redéploiement Web et d'un inventaire explicite des dépendances non restaurables. Une voie de sortie non testée reste `PLAN` ; ne pas multiplier les workflows, schémas ou interfaces de secours avant preuve d'un besoin actuel.

## 8. Sources et documents de référence

### Contrats internes

- [Sauvegarde et restauration Supabase](./supabase-backup-restore.md)
- [Configuration des environnements](./environment-configuration.md)
- [Services Web Stack](./services-stack.md)
- [Configuration e-mail](./email-setup.md)
- [ADR-001 : Clerk](../architecture/adr/ADR-001-clerk-auth.md)
- [ADR-004 : identité Mobile](../architecture/adr/ADR-004-companion-identity.md)
- [`apps/web/vercel.json`](../../apps/web/vercel.json)
- [`apps/web/src/lib/services/email.ts`](../../apps/web/src/lib/services/email.ts)
- [`apps/mobile/shared/lib/supabase.ts`](../../apps/mobile/shared/lib/supabase.ts)

### Sources fournisseurs (documentation à revalider lors de l'exercice)

- Supabase, [Database Backups](https://supabase.com/docs/guides/platform/backups) et [Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
- Clerk, [Migrating your data / Migrating from Clerk](https://clerk.com/docs/guides/development/migrating/overview)
- Vercel, [Environment Variables CLI](https://vercel.com/docs/cli/env)
- Next.js, [Deploying](https://nextjs.org/docs/app/getting-started/deploying)
- Resend, [Exports General Availability](https://resend.com/changelog/exports-general-availability) et [Email Suppressions](https://resend.com/changelog/suppression-list-support)
- GitHub, [Backing up a repository](https://docs.github.com/en/repositories/archiving-a-github-repository/backing-up-a-repository)
