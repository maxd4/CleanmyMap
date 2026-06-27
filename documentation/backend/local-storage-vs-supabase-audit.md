# Audit localStorage vs Supabase

## Résumé

Après inspection des routes API, des stores serveur et des préférences UI, je n'ai trouvé aucune écriture Supabase "inutile" qui puisse être déplacée vers `localStorage` sans casser la synchronisation, l'historique, les permissions ou la conformité.

Le projet utilise déjà `localStorage` pour les préférences d'interface. Les changements appliqués ici ont surtout pour but de centraliser ces états locaux dans une couche typée et SSR-safe, pas de déplacer des données métier hors de Supabase.

Référence canonique à garder en tête:

- [Guide développeur Supabase](../development/supabase-quota-guide.md)

## Où stocker quoi

| Type de donnée | Emplacement par défaut | Point d'attention |
| --- | --- | --- |
| Contenus pédagogiques, guides, décisions, checklists durables | Repo Markdown / Git | Versionner et publier comme contenu statique dès que possible |
| Préférences UI, brouillons non critiques, quiz anonymes, états temporaires | `localStorage` | Garder ces états côté navigateur tant qu'ils n'ont pas de valeur métier durable |
| Données métier vivantes, comptes, rôles, actions, participations, agrégats persistés | Supabase | Soumettre aux RLS, borner les lectures et ne pas dupliquer le calcul côté client |
| Données dérivées lues souvent mais recalculables | Cache HTTP, ISR, `SWR`, cache applicatif | Utiliser le cache pour réduire les recalculs, jamais comme source de vérité |
| Fichiers téléchargeables, images uploadées, PDF générés, exports réutilisables | Fichier préparé / Storage | Conserver seulement les métadonnées minimales en base si le fichier doit rester utile |

## Doit rester dans Supabase

- `profiles` et synchronisation Clerk -> Supabase : identité, rôle, avatar, données de territoire et compatibilité `arrondissement` héritée.
- `actions` et `spots` : déclarations, géométrie, dates, volumes, notes, photos et métadonnées.
- `newsletter_subscriptions` : email et consentement RGPD.
- `community_events` / `event_rsvps` : événements, RSVP et compteurs.
- `community_bug_reports` : type de retour, titre, description, page, auteur, statut.
- `promotion_requests` : rôle demandé, motivation, état de traitement.
- `partner_onboarding_requests` : identité légale, couverture, disponibilité, contact, motivation.
- `app_messages` : messagerie, destinataire, canal, pièces jointes et contexte géographique.
- `progression_events` / `progression_profiles` / `quiz_srs` : progression, révision et apprentissage synchronisés entre appareils.
- `checklist_progress` : état de checklist utilisateur synchronisé.
- `runbook_checks` : données opérationnelles et d'exploitation.
- `training_examples` : données de supervision liées aux images et à l'estimation.
- `app_notifications` : notifications destinées à l'utilisateur.

## Compatibilité territoire

- les nouveaux champs de localisation doivent vivre dans `profiles.metadata` et rester synchronisés avec `paris_arrondissement` tant que des comptes historiques existent ;
- les champs `territory*` sont la source de vérité fonctionnelle ;
- `arrondissement`, `zoneName` et `parisArrondissement` restent des alias de lecture ou de migration, pas le modèle principal ;
- un backfill progressif est préférable à une réécriture brutale des comptes existants.

## Contenus pédagogiques et quiz

- les contenus pédagogiques, guides, notices, ressources et pages "apprendre" doivent rester dans le repo Git et servir comme contenu statique quand c'est possible;
- les quiz ne doivent pas écrire en base par défaut;
- pour remontrer les mauvaises réponses ou conserver un état anonyme local, `localStorage` suffit;
- Supabase ne devient pertinent que pour un suivi connecté, par exemple une progression personnelle réellement utile, stable et justifiable;
- si un quiz ou un guide n'apporte pas de valeur multi-appareils, il ne doit pas devenir une nouvelle table.

## Formulaires, agrégats et exports

- les formulaires bénévoles doivent rester à écriture unique: une soumission complète = une écriture;
- l'auto-save permanent, les brouillons synchronisés à chaque frappe et la persistance de chaque changement de champ sont à éviter;
- les estimateurs graphiques doivent s'appuyer sur des données agrégées plutôt que sur des micro-événements persistés un par un;
- les documents générés doivent être produits à la demande, téléchargés, puis résumés en base seulement si un suivi minimal est réellement utile.

## Peut rester côté frontend dans `localStorage`

- `cleanmymap.locale` : préférence d'affichage locale.
- `cleanmymap.theme` : thème d'interface.
- `cleanmymap.display_mode` : mode de rendu de l'interface.
- `cleanmymap.display_mode_pending_sync` : état technique temporaire.
- `cleanmymap_cookie_consent` : choix de consentement cookies/analytics.
- `cmm_dashboard_days` : période de comparaison affichée dans l'interface.
- `cleanmymap.guide.checklist` : checklist locale de la page guide.
- Filtres, tris, onglets et états de vue purement visuels si un besoin similaire apparaît.

## Ne doit pas être stocké tel quel

- `featureFlags` et `abTests` : ces données ressemblent à des artefacts de démo / expérimentation locale. Elles peuvent rester en mémoire de session ou être remplacées par de la configuration déterministe plutôt que persistée.
- `formMetrics` : métriques locales d'analyse de formulaire, à réserver au debug ou à une collecte explicite si le besoin produit est confirmé.

## Nécessite clarification

- `cmm_action_draft` : le brouillon reste local, ce qui est cohérent, mais il peut contenir des données potentiellement sensibles ou très personnelles comme des emplacements, des notes libres et des données photo. Avant toute évolution de rétention, il faut décider si ce brouillon doit être conservé longtemps, limité à la session, ou protégé par une suppression explicite.
- `quiz_srs` en mode anonyme : le fallback local est acceptable, mais la version connectée doit rester synchronisée côté serveur.

## Changements appliqués

- Ajout d'une couche `localStorage` typée et SSR-safe.
- Centralisation des préférences site et du consentement cookies.
- Remplacement des accès directs locaux pour quelques états purement UI.
- Aucun déplacement de donnée métier hors de Supabase.
