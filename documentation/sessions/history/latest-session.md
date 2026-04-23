# Latest Session

Updated: 2026-04-23
Status: CLOSED

## Done
- **Supabase - passe nettoyage test** : audit et suppression ciblee executes sur `actions` et `spots` (marqueurs seed/demo/test explicites), aucun enregistrement test detecte/supprime en base a cette date.
- **Purge des actions de test (runtime repo)** : suppression du dataset `apps/web/data/local-db/test_records.json`, retrait du store `test` du loader local et filtrage défensif des contrats “test-like” dans la source unifiée pour éviter tout affichage parasite à côté des données Google Sheet.
- **PostHog vérifié de bout en bout** : correction de la lecture des variables côté client (`process.env.NEXT_PUBLIC_*`), initialisation stable du provider, déploiement Vercel production relancé, interaction navigateur automatisée sur `https://cleanmymap.fr` et envoi d’un event de validation `cmm_posthog_installation_check` vers l’instance EU.
- **PostHog stabilisé (local + Vercel)** : suppression des doublons serveur, configuration unifiée clé/hôte/région, compatibilité temporaire `NEXT_PUBLIC_POSTHOG_TOKEN` (déprécié), check `/api/services` aligné, test dédié de capture d’event serveur ajouté et validé.
- **Priorité 1 - fiabilité du socle et sécurité**
  - **Vérification complète exécutée** : `typecheck`, `test:regression-gates`, `test` complet et `build` production relancés avec succès après corrections.
  - **Régressions de tests corrigées** : alignement des routes protégées, libellés KPI communautaires, garde accents FR et test `POST /api/actions` rendu déterministe (sans dépendance réseau).
  - **Auth fallback build-safe** : suppression du bruit `DYNAMIC_SERVER_USAGE` dans le fallback auth pour éviter les faux positifs en build.
  - **Supabase fallback fail-fast** : suppression des clients placeholder silencieux au profit d’un fallback explicite qui échoue immédiatement avec message clair.
  - **Sentry vérifié côté code** : chaînage client / serveur / edge confirmé, activation conditionnelle au DSN et build plugin piloté par `SENTRY_BUILD_PLUGIN`.
  - **Supervision services web enrichie** : `GET /api/services` étendu avec un registre central `src/lib/services/registry.ts`, métadonnées de service (`label`, `description`, `category`) et affichage amélioré dans `SystemStatusPanel`.
  - **SheetJS corrigé** : remplacement de `xlsx` par la tarball corrigée `0.20.3` via dépendance directe et `overrides`.
  - **CI/CD Fixes** : correction des erreurs GitHub Actions, des soucis TypeScript, de la migration middleware/proxy et des vulnérabilités npm.
  - **Purge Vercel étendue** : suppression du dernier preview non-production encore présent.
  - **Nettoyage historique Vercel** : suppression de 22 déploiements `ERROR`.
  - **Nettoyage historique GitHub Actions** : suppression de tous les runs en échec visibles via l’API.
  - **Mode d'affichage persistant** : lecture serveur depuis Clerk et persistance via `/api/account/display-mode`.
  - **Mutation de rôle Clerk verrouillée** : mutation serveur limitée aux profils self-service, synchro Supabase et refus des rôles admin/elu.
  - **Blocages harmonisés** : formulation commune des écrans de connexion, floutés ou désactivés.
  - **Clôture de la matrice d'accès Clerk** : harmonisation des états de blocage et garde générique renforcé.
  - **Matrice d'accès Clerk appliquée** : classification page par page en visible, désactivé ou flou + accès Clerk requis.

- **Priorité 2 - navigation et premier écran**
  - **Ruban app unifié pleine largeur** : refonte du header applicatif en ruban global plein écran.
  - **Navigation plus claire** : breadcrumb plus explicite et bouton `Explorer` vers le plan du site.
  - **Bandeau compact** : titre du site harmonisé en `Agir-Cartographier-Préserver`.
  - **Navigation mobile** : ruban fixe du bas pour blocs et rubriques du bloc actif.
  - **Ruban mobile compacté** : réduction des hauteurs et paddings pour petits écrans.
  - **Ruban masqué par défaut** : ouverture uniquement au survol du haut de page sur desktop, avec bouton explicite d’affichage/masquage sur mobile.
  - **Navigation plus lisible sur desktop** : emoji par défaut, nom du bloc au survol ou sur le bloc actif.
  - **Zoom desktop réduit** : taille globale abaissée d’environ 10% sur ordinateur via la base typographique.
  - **Accueil public et navigation ouverte** : page d’accueil centrée sur l’accès libre, avec compte seulement quand nécessaire.
  - **Accueil - formulaire en premier plan** : bloc bénévole remonté dans le hero.
  - **Accueil - hero mobile compact** : hero raccourci sur petits écrans.
  - **Accueil - présentation du formulaire resserrée** : section `Visiter le site` supprimée pour enlever le doublon.
  - **Accueil - CTA clarifiés** : les boutons du hero ont été recentrés sur `Se connecter`, `Visiter le site en tant qu'invité`, `Déclarer une action` et `Générer un rapport d'impact`.

- **Priorité 3 - déclaration, carte et parcours**
  - **Déclarer - expérience mobile** : formulaire réordonné mobile-first.
  - **Déclarer - poids et photos** : bloc poids central, photos optionnelles, marquage d’écart suspect.
  - **Déclarer - base + lieu/tracé** : bloc `Lieu / tracé` unifié dans le formulaire principal.
  - **Déclarer - largeur de formulaire** : formulaire remis en flux plein largeur.
  - **Déclarer - parcours simplifié** : chemin visible `1. Localiser / 2. Tracer / 3. Valider`.
  - **Formulaire bénévole** : saisie `départ` / `arrivée` avec route dérivée.
  - **Cas d'apprentissage clarifié** : photos limitées aux sacs collectés et masse utilisée comme label d’entraînement.
  - **Vision de terrain** : variables intermédiaires éditables et préremplissage du poids quand le signal est suffisant.
  - **Boucle d’apprentissage** : `training_examples`, persistance best-effort et métriques de dataset.
  - **Aperçu trajet live** : tracé calculé dès la saisie et message d’ajustement transmis à l’action.
  - **Vision sans auto-remplissage** : valeurs conseillées affichées sans remplissage automatique.
  - **Précisions d'entraînement simplifiées** : masse, sacs, remplissage et densité seulement.
  - **Photos facultatives** : soumission possible sans photo.
  - **Écart suspect** : signal visuel sans blocage.
  - **Tracé auto** : géométrie automatique depuis départ/arrivée ou fallback zone.
  - **Sandbox de visualisation** : rubrique dédiée du bloc `Visualiser`.

- **Priorité 4 - rapports, méthode et pilotage**
  - **Next exécuté - QA visuelle ruban mobile (320/375/390)** : captures headless et validation du premier écran sur les 3 largeurs.
  - **Next exécuté - export PDF A4 court/long** : exports contrôlés avec pagination lisible.
  - **Next exécuté - quantification `created_by_clerk_id`** : métrique de couverture publiée avec cas `n/a` géré.
  - **Risks - pagination PDF sécurisée** : classes print dédiées pour les blocs denses.
  - **Risks - périmètre compte mesuré** : couverture `created_by_clerk_id` exposée dans le modèle et l’UI.
  - **Risks - portail sponsors contextualisé** : fenêtre d’observation et comparabilité temporelle explicites.
  - **Dashboard Admin - vues gouvernance reliées aux états métier** : compteurs `pending / accepted / rejected` et journal des opérations.
  - **Mode Science - formules exposées en tooltips** : formules, sources, fréquence et limites visibles sur les KPI.
  - **Rapport d'impact PDF renforcé** : couverture institutionnelle et narration budgétaire.
  - **Exports livrables par périmètre** : scopes `global`, `compte`, `association`, `arrondissement`.
  - **Rubriques bilingues** : `DecisionPageHeader` et `PageReadingTemplate` gèrent l’anglais.

- **Priorité 5 - réseau, annuaire et collaboration**
  - **Godmode admin nettoyé** : suppression des lignes utilisateurs factices (`example.com`) et remplacement des boutons non branchés par des accès opérationnels réels (`/admin`, `/reports`, `/api/health`).
  - **Académie du Climat - ateliers structurés** : espace dédié classé par type et relié aux sources officielles.
  - **Académie du Climat - social renforcé** : ajouts ciblés sur la catégorie `social`.
  - **Annuaire partenaires - tests de contenu et crédibilité locale** : liens placeholders interdits, partenaires engagés exigés.
  - **Annuaire partenaires - UX resserrée** : moins d’actions, moins de redondance.
  - **Annuaire partenaires - crédibilité renforcée** : canaux, zones et fraîcheur minimale vérifiés.
  - **Sync réel carte aligné** : import structuré et store local compatibles carte.
  - **Onboarding partenaire structuré** : `coverage` et `availability` normalisés.
  - **Réseau séparé en 3 usages** : découverte, pilotage et onboarding isolés.
  - **Import Google Sheet - nouvelle structure** : colonnes `Départ / Arrivée / Type de Lieu / Qualité Mégots`.
  - **Onboarding partenaire → fiche publiée** : fiche “à revalider” publiée via store dédié.
  - **Annuaire partenaires - fiche Green Flex** : remplacement du lien placeholder.
  - **Annuaire partenaires** : ajout de Klin d'oeil dans les partenaires engagés.
  - **Annuaire partenaires - second balayage** : suppression du faux canal public Facebook.
  - **Annuaire partenaires - revue admin** : cycle `pending_admin_review / accepted / rejected`.
  - **Partenaires - séparation vitrine / décision** : `network` pour la découverte, `dashboard` pour la supervision.
  - **Bloc Piloter** : fallback visuel pour éviter un bloc vide.
  - **Parcours Mobilisation + chat - nominal / dégradé / vide** : `ChatShell` durci avec états explicites et tests.
  - **Notifications In-App** : `NotificationBell` et suppression des emails automatiques.
  - **Retour Haptique** : vibrations standards et succès majeurs.
  - **Gamification** : détection de `Level Up` et notifications d’engagement.
  - **Profils** : synchronisation des `@handle` Clerk vers Supabase.

- **Priorité 6 - documentation et audit produit**
  - **Audit rubriques bénévoles** : vérification de la visibilité des sections `guide`, `kit`, `route`, `trash-spotter`, `messagerie` dans le ruban de navigation et confirmation de leur accessibilité via les routes `/sections/[sectionId]`.
  - **Audit utilité-impact rubriques** : comparaison du fichier `documentation/product/rubriques_utilite_impact_.txt` avec l'état actuel du site, identification des fonctionnalités manquantes (heatmap/radar visuel) et mise à jour de la documentation pour refléter les changements récents.
  - **Infobulles rubriques ruban** : ajout d'infobulles explicatives sur chaque rubrique du ruban de navigation justifiant leur utilité et impact pour les utilisateurs, avec séparation maintenue entre `sandbox` et `carte`, ainsi que pour les trois autres rubriques distinctes.
  - **Mise à jour résumé rubriques** : restructuration du fichier `documentation/product/rubriques_utilite_impact_.txt` par blocs et rubriques selon l'état actuel du dépôt, ajout de la page d'accueil et précisions sur la visibilité par rôle (ex: `Météo` réservée aux profils `coordinateur`, `scientifique`, `elu`, `admin`).
  - **Complétion infobulles navigation** : ajout d'infobulles descriptives pour les blocs de navigation (indiquant le nombre de rubriques par bloc) et amélioration des infobulles rubriques avec label + description, validation sans erreurs TypeScript.

## In Progress
- Intégration API Cleanwalk.org (Message type envoyé, en attente de réponse).

## Next
- Migrer définitivement les environnements restants vers `NEXT_PUBLIC_POSTHOG_KEY` (retirer `NEXT_PUBLIC_POSTHOG_TOKEN` après validation Preview + Production).
- Validation des infobulles en production : tester l'affichage des tooltips sur différents navigateurs et appareils pour confirmer l'accessibilité et la lisibilité.
- Audit UX des infobulles : recueillir feedback utilisateur sur la pertinence et la clarté des descriptions d'utilité/impact.
- Extension des infobulles : envisager l'ajout d'infobulles sur d'autres éléments de navigation ou d'interface pour améliorer la découvrabilité globale.

## Risks
- **Migration PostHog incomplète** : si certains environnements utilisent encore `NEXT_PUBLIC_POSTHOG_TOKEN`, l’intégration reste fonctionnelle mais en mode compatibilité déprécié (à retirer après bascule complète).
- **Dette lint historique** : `npm run lint` global reste en échec avec des erreurs antérieures hors périmètre de cette passe (principalement `react/no-unescaped-entities`, `no-explicit-any` et règles hooks). Runtime, tests et build sont verts, mais la conformité lint complète nécessite une passe dédiée.
