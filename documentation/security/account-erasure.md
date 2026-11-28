# Suppression de compte : contrat canonique cible

**État : `PLAN / TARGET`, décision produit validée le 28 novembre 2026.** Ce contrat fixe le comportement à implémenter ; il ne prouve ni l'effacement automatique, ni la conformité opérationnelle actuelle. Owner : cycle de vie de l'identité, AuthN/AuthZ et données personnelles. Web et Mobile utilisent un seul owner serveur. Le contrat runtime actuel reste [authz-authn-donnees.md](./authz-authn-donnees.md) et la [gouvernance des données](../architecture/data-governance.md).

## 1. Invariants

- L'effacement du compte n'est ni une simple désactivation ni une suppression en cascade du profil. L'identité Clerk, les accès et les données personnelles supprimables disparaissent ; les faits collectifs et les échanges admissibles sont préservés.
- Aucune nouvelle permission, participation, présence, mesure, attribution individuelle, XP ou récompense ne résulte d'un effacement. Les contributions scientifiques restent historisées avec leurs versions et leurs valeurs connues ou inconnues.
- La conservation d'une donnée identifiable exige une finalité, une base juridique, une durée et un accès justifiés. Un pseudonyme, un identifiant opaque ou un hash peuvent encore être des données personnelles. Les textes libres et médias sont inclus dans l'examen de réidentification.
- Les demandes légitimes d'effacement et les exceptions sont instruites conformément aux articles 12, 17 et 19 du RGPD. Réponse sans retard injustifié et au plus tard un mois après réception, prolongation de deux mois seulement si nécessaire et information motivée dans le premier mois. Ne pas promettre un effacement fournisseur ou une anonymisation non vérifiés.
- Aucun compte réel ne sert de fixture destructive. L'activation de la suppression réelle exige la réception de tous les traitements et des preuves de bout en bout.

## 2. Décision par famille de données

| Famille | Traitement cible |
|---|---|
| Clerk, profil, nom, email, avatar, méthodes de connexion, résidence, travail, préférences, sessions | Révoquer les accès, effacer les données supprimables, supprimer Clerk après traitement des dépendances |
| Rôles, mandats, permissions, parrainage, consentements, inscriptions et demandes futures | Révoquer ou annuler ; traiter les dépendances et responsabilités avant effacement |
| Notifications, newsletter, abonnements, quotas, historique individuel, quiz/SRS, progression, XP, badges et classements | Effacer les données personnelles, retirer les projections et arrêter les envois ; exceptions d'audit minimales justifiées |
| Mon empreinte IA, lieux visités, traces GPS personnelles, brouillons privés | Effacer les données et objets associés |
| Messages des canaux de discussion | Conserver le contenu admissible, ordre, dates, contexte, réponses et fil ; dissocier l'identité et supprimer ou occulter les éléments personnels non justifiés |
| Messages privés et pièces jointes | Examiner les droits des destinataires et la nécessité de conservation ; conserver les échanges admissibles sans ouvrir de nouveau canal ni divulguer de données |
| Retours utilisateurs, bugs, suggestions, prises de contact | Conserver les contenus utiles, références, dates, statuts et décisions ; supprimer les coordonnées et identifiants non nécessaires, examiner captures, pièces jointes et texte libre |
| Actions terminées et mesures collectives | Conserver les faits admissibles si anonymisation effective possible ; préserver mesures, effectifs physiques, durée, versions statistiques et méthodes |
| Actions futures, événements, équipes et organisations | Annuler les inscriptions du compte, retirer les rôles ; transfert autorisé ou suspension/annulation en l'absence de responsable |
| Rapports d'impact générés par le compte | Effacer intégralement, toutes portées et tous thèmes, y compris publications, PDF, instantanés et partages |
| Données comptables, obligations légales, litiges et audit nécessaire | Conservation minimale, accès restreint, durée et justification explicites ; pas de conservation générale par commodité |
| Fournisseurs, caches, objets et sauvegardes | Purge ou traitement documenté selon capacité, finalité et rétention ; vérifier les restaurations |

La matrice d'exécution doit recenser toutes les relations réelles, clés d'identité, FK, JSON, textes, vues, caches, jobs, fournisseurs et fichiers. Catégories : DELETE, ANONYMIZE, RETAIN_JUSTIFIED, NOT_APPLICABLE. Une relation non classée ou une obligation non résolue interdit de déclarer l'effacement complet. La matrice peut être générée ou contrôlée contre le schéma ; ne pas figer ici un compteur de tables.

## 3. Contributions conservées et auteur supprimé

Dans un canal de discussion, les messages d'une personne supprimée restent lisibles et les autres membres conservent leurs échanges. Les retours, suggestions, signalements et prises de contact restent exploitables avec leur historique de traitement. L'affichage retenu, si le maintien de l'ancien pseudonyme est légitimement justifié, est :

```text
ancienpseudo [Utilisateur supprimé le JJ/MM/AAAA]
```

Sinon utiliser `Utilisateur supprimé le JJ/MM/AAAA` sans pseudonyme. La date correspond à la suppression effective ; si la date est inconnue, omettre la date sans l'inventer. Le suffixe de transition du [changement de pseudonyme](./account-handle-lifecycle.md) disparaît. Ne pas exposer un nom réel auparavant masqué. Pas d'avatar, lien de profil, possibilité de message ou mention active, identifiant Clerk public, droit ou compte authentifiable fictif. Distinguer la représentation historique minimale du profil actif. Le libellé ne doit pas être une nouvelle clé d'authentification.

Le schéma relu le 28 novembre 2026 comporte une FK `app_messages.sender_id` vers `profiles.id` avec ON DELETE CASCADE et sender_id NOT NULL ; la FK recipient_id applique ON DELETE SET NULL. Avant de supprimer les profils, adapter les dépendances et projections de manière à préserver les échanges et leur confidentialité. Une conversation privée ne doit jamais devenir publique parce que son destinataire est effacé. Les FK des missions et les références aux retours utilisateurs imposent également un traitement explicite. Les champs d'identité de `community_bug_reports` et `contact_requests` ne doivent pas obliger à garder un email ou un compte fictif. Préserver les statuts et décisions utiles ; prévoir un traitement ciblé des contenus identifiants. Aucun simple remplacement global de chaînes de caractères.

## 4. Rapports d'impact

Supprimer tous les rapports générés par l'utilisateur, même s'ils étaient publics, partagés, associatifs, territoriaux ou collectifs. Cela inclut `reports.owner_clerk_id`, `report_generations.created_by_clerk_id`, les instantanés et les variantes dans `report_generation_pdf_artifacts`, `report_generation_pdf_shares` et `report_generation_publications`. Révoquer d'abord les accès, publications, liens et travaux de génération en cours ; utiliser les owners du [moteur de rapports](../features/reports/README.md) et l'API Storage officielle pour effacer les objets concernés. Tenir compte des FK des publications et artifacts avant suppression des générations. Vérifier les objets manquants et les échecs de purge, avec reprise idempotente. Préserver les actions sources et les rapports indépendamment générés par des tiers. Ne jamais prétendre effacer une copie déjà téléchargée par un tiers ; informer les destinataires lorsque requis. Une conservation légale exceptionnelle est isolée et motivée, non une bibliothèque accessible.

## 5. Ressources partagées

Préserver les quantités de déchets, mégots, effectifs réellement présents, dates, durée, contexte mesuré, provenance et versions scientifiques. Effacer les relations nominatives et droits du compte ainsi que ses attributions personnelles. Examiner notes, descriptions, géométries et médias pour les risques de réidentification. Si nécessaire, retirer la projection publique ; ne pas déclarer une anonymisation en présence d'une identité indirecte.

Les actions futures, organisations, mandats, événements SPOGOMI et responsabilités terrain utilisent leurs contrats existants. En cas de dernier responsable, transfert à une personne explicitement autorisée ou suspension/annulation selon la ressource. Pas d'attribution automatique à un tiers ni suppression automatique d'une association ou entreprise. Préserver les résultats sportifs officiels et les preuves légalement nécessaires sans maintenir les accès de l'ancien compte. Traiter les synchronisations externes et tâches différées pour empêcher toute recréation de l'identité.

## 6. Parcours utilisateur

Point canonique Web : /reglages (AccountSettingsEditor et AccountSettingsView). Le profil, les menus de compte, AccountSettingsSection et les options de sécurité pertinentes y conduisent. Mobile utilise le même contrat serveur. /contact reste accessible aux personnes sans compte ou sans accès ; la vérification d'identité précède toute action destructive.

Trois surfaces distinctes :
1. Bouton initial « Supprimer mon compte », sans mutation.
2. Dialogue informatif : données supprimées, conservées/anonymisées, tous les rapports générés supprimés, conséquences pour les responsabilités collectives, exceptions justifiées et possibilité d'obtenir une copie des données. Boutons Annuler et Continuer, aucun effet destructif.
3. Seconde confirmation sur une surface distincte : saisir la phrase « SUPPRIMER MON COMPTE » (équivalent localisé en EN), réauthentification récente et bouton final destructif à un emplacement différent des boutons précédents. Aucun autofocus destructif, propagation de clic, double clic, touche Entrée involontaire ou rejeu ne franchit plusieurs étapes. Retour et annulation possibles avant engagement.

Le serveur impose une confirmation liée à l'identité authentifiée, à la session et à l'opération, de durée limitée et à usage unique ; l'idempotence protège des répétitions. Aucun composant Clerk natif ne doit proposer un chemin contournant le traitement. FR/EN, clavier, focus, responsive et trois modes. Respecter [UI_COPY_CONCISION](../design-system/UI_COPY_CONCISION.md) sans omettre les conséquences essentielles.

## 7. Orchestration, sécurité et restauration

Le store de demandes RGPD existant est le point d'entrée. Les états de notification queued/sent/failed de contact_requests ne prouvent pas un effacement. Distinguer l'état métier durable : demande, gel, inventaire/dry-run, traitement, attente ou exception justifiée, reprise, vérification et clôture. Une seule demande active par compte ; opérations bornées, concurrence revalidée et idempotence.

Dès engagement effectif, bloquer écritures, permissions et synchronisations du compte sur Web, Mobile, Data API et jobs, révoquer les sessions et empêcher les anciennes sessions ou requêtes tardives de recréer un profil. La suppression Clerk est une étape de clôture, pas le déclencheur unique. Traiter aussi les suppressions externes à l'application et les comptes critiques, sans rendre l'effacement impossible. Une nouvelle inscription avec la même adresse ne doit pas récupérer les anciennes données, droits ou récompenses.

Traiter les buckets avatars, reports, signalement-evidence, chat-attachments et action-photos, en revalidant les références partagées. Ne pas supprimer directement storage.objects. Réutiliser le [dispositif de sauvegarde chiffrée](../operations/supabase-backup-restore.md) : contrôler les rétentions, préserver les archives immuables selon leur échéance, empêcher la réapparition des données effacées lors d'une restauration avant remise en service. La preuve minimale d'effacement ou le mécanisme de non-réapparition reste protégé, borné en durée et non public.

Recenser les fournisseurs effectivement utilisés (Clerk, Supabase, PostHog, Vercel, Sentry, Resend, Stripe, etc.). Distinguer suppression démontrée, traitement manuel requis et exception légale. Ne pas ajouter de cron parallèle au registre de maintenance existant. RLS/grants et RPC doivent empêcher la suppression d'un autre compte ou le contournement par le navigateur. Le dry-run et les logs ne contiennent pas de données personnelles inutiles.

## 8. Séquencement et réception

- ERASURE-BASE : inventaire et classification, orchestration durable, garde de gel et de concurrence, identité et droits. Mutation destructive désactivée.
- ERASURE-PRIVATE et ERASURE-REPORTS : traitements personnels et rapports, révoquer les accès ; ne supprimer ni le profil ni Clerk avant résolution des dépendances collectives.
- ERASURE-COLLECTIVE : messages, retours, contacts, actions, organisations, responsabilités, SPOGOMI, projections et anonymisation ; adapter la FK de messagerie avant suppression de profil.
- ERASURE-FINAL et ERASURE-UI : fournisseurs, sauvegardes, double confirmation et points d'entrée, suppression finale et vérification.

Tests : deux identités distinctes, accès anon/auth/service, références indirectes, dernier owner, actions terminées/futures, messages conservés et confidentialité DM, retours/contact, rapports tous thèmes et partages, échecs/reprise Storage et fournisseurs, ancienne session, concurrence, réinscription, restauration, double confirmation et annulation. Exécuter PostgreSQL isolé et E2E Clerk Development avec comptes synthétiques, mesurer les couvertures pertinentes indépendamment par workspace ; ne pas affaiblir RLS ni hooks.

STOP CONDITION : tous les traitements vérifiés sur le candidat exact et un compte de test, aucune perte collective injustifiée, aucun rapport du compte encore accessible, aucun accès résiduel, aucune identité conservée sans justification, exceptions bornées et preuve de publication. Mettre à jour les fiches CURRENT, politique de confidentialité et procédures opérationnelles uniquement à mesure de l'intégration démontrée.

## 9. Références

- [RGPD, règlement (UE) 2016/679, articles 5, 12, 17 et 19](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
- [CNIL, droit à l'effacement](https://www.cnil.fr/fr/le-droit-leffacement-supprimer-vos-donnees-en-ligne).
- Code relu sur main le 28 novembre 2026 : apps/web/src/app/api/mobile/account/deletion-request/route.ts, apps/web/src/app/api/contact/route.ts, apps/web/src/lib/contact/contact-requests-store.ts, apps/web/src/components/account/account-settings-editor.view.tsx, apps/web/src/lib/authz-identity.ts, apps/web/src/lib/auth/sync-orchestration.ts et owners reports/chat. Le Web renvoie actuellement au contact RGPD et Mobile enregistre une demande ; la suppression automatisée complète n'est pas démontrée.
