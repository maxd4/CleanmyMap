# État de développement du site

Date de génération: 2026-04-28

## Résumé global

Le site n'est pas prêt pour une première version publique. La base fonctionnelle existe, mais le rendu global reste trop inégal, trop chargé et trop indulgent dans son évaluation actuelle. En lecture publique stricte, le score moyen tombe plutôt autour de **54/100**. Les écrans centraux les plus défendables se situent plus près de **63/100** que de 74/100.

Les surfaces réellement proches d'une mise en ligne publique sont encore peu nombreuses: accueil, Explorer, point de départ (Apprendre), rapports, actions et quelques rubriques réseau. Le reste reste soit trop fragile, soit trop dépendant du runtime, soit trop enfermé visuellement, soit trop orienté back-office pour être exposé tel quel.

Les zones les plus faibles sont nettes et doivent être traitées comme des freins de lancement: `admin/forms`, `sign-in`, `sign-up`, `onboarding/localisation`, la comparaison interne des formulaires, `parcours`, `profil`, `parcours/[profile]`, `sections/[sectionId]` et les écrans très dépendants de Clerk ou de données serveur non garanties.

Deuxième passe:

- **33 routes de pages non API** recensées dans `apps/web/src/app`.
- **27 entrées de rubriques** repérées dans `RUBRIQUE_REGISTRY`: 26 visibles et 1 cachée (`history`).
- Les routes API sous `apps/web/src/app/api` sont repérées comme support technique, mais non notées dans le tableau UI car elles ne sont pas des pages ou rubriques affichées.
- Les pages Clerk, admin et dynamiques sont à vérifier en runtime, car leur état réel dépend de l'authentification, du rôle, du profil ou des données.

## Méthode de notation

- Les scores sont des estimations basées uniquement sur le code du repo, sans validation navigateur complète ni test utilisateur.
- Lecture volontairement dure pour une version publique:
  - 0-10 %: absent
  - 11-25 %: quasi inutilisable
  - 26-40 %: prototype fragile
  - 41-55 %: exploitable en interne seulement
  - 56-70 %: acceptable uniquement pour un périmètre simple et stable
  - 71-84 %: bon mais pas encore public sans retouche
  - 85-100 %: réellement prêt
- Le `Score moyen` reste une moyenne simple des axes ci-dessous, mais la lecture produit doit retrancher une pénalité quand une page dépend d'un runtime, d'une authentification Clerk, d'un état visuel non vérifié, ou de conventions trop décoratives.
- Quand une page dépend d'un runtime, d'une authentification Clerk ou d'un état visuel difficile à confirmer depuis le code, le statut est noté `À vérifier`, même si le score brut paraît élevé.

Périmètre scanné:

- `apps/web/src/app` pour les pages applicatives.
- `apps/web/src/lib/sections-registry/config.ts` pour les rubriques internes.
- `apps/web/src/lib/navigation.ts` pour la navigation visible.
- `apps/web/src/components/sections/section-renderer.tsx` pour le rendu des sections.
- `apps/web/src/app/api` uniquement comme contexte backend, sans notation page par page.

Axes notés:

- Fonctionnalité: logique métier, données, actions, formulaires, navigation.
- UX: clarté du parcours, hiérarchie, compréhension, états loading/empty/error/success.
- UI: qualité visuelle, cohérence des composants, lisibilité, responsive.
- Direction artistique libre: personnalité propre, variation créative, ambiance spécifique.
- Accessibilité: contrastes, labels, focus, navigation clavier, textes alternatifs.
- Robustesse: erreurs, cas limites, stabilité, tests, absence de régressions visibles.
- Documentation/IA: clarté pour futurs agents IA, commentaires utiles, fichiers ou notes associées.

## Tableau global des pages


| Page/Rubrique              | Route                      | Fonctionnalité | UX  | UI  | Direction artistique | Accessibilité | Robustesse | Documentation/IA | Score moyen | Statut              | Priorité |
| -------------------------- | -------------------------- | -------------- | --- | --- | -------------------- | ------------- | ---------- | ---------------- | ----------- | ------------------- | -------- |
| Accueil                    | `/`                        | 83             | 81  | 84  | 82                   | 80            | 79         | 81               | 81          | Presque prêt        | Basse    |
| Explorer / Plan du site    | `/explorer`                | 84             | 84  | 85  | 83                   | 83            | 80         | 82               | 83          | Presque prêt        | Basse    |
| Rapports d'impact          | `/reports`                 | 80             | 78  | 78  | 75                   | 77            | 73         | 78               | 77          | Utilisable          | Moyenne  |
| Point de départ (Apprendre) | `/learn/hub`               | 82             | 80  | 83  | 84                   | 79            | 75         | 79               | 80          | Presque prêt        | Basse    |
| Déclarer une action        | `/actions/new`             | 80             | 78  | 77  | 75                   | 78            | 74         | 77               | 77          | Utilisable          | Moyenne  |
| Carte des actions          | `/actions/map`             | 79             | 77  | 78  | 76                   | 76            | 72         | 75               | 76          | Utilisable          | Moyenne  |
| Historique des actions     | `/actions/history`         | 70             | 68  | 69  | 66                   | 69            | 65         | 67               | 68          | Fonctionnel partiel | Moyenne  |
| Tableau de bord            | `/dashboard`               | 78             | 76  | 76  | 73                   | 75            | 71         | 74               | 75          | Utilisable          | Haute    |
| Administration             | `/admin`                   | 75             | 73  | 72  | 70                   | 72            | 68         | 71               | 71          | Utilisable          | Haute    |
| Services techniques        | `/admin/services`          | 72             | 71  | 72  | 69                   | 71            | 70         | 68               | 70          | Utilisable          | Moyenne  |
| Form Admin Panel           | `/admin/forms`             | 44             | 42  | 41  | 40                   | 43            | 45         | 39               | 42          | Prototype           | Haute    |
| God Mode                   | `/admin/godmode`           | 55             | 52  | 54  | 57                   | 52            | 60         | 47               | 54          | Fonctionnel partiel | Haute    |
| Déclaration complète       | `/declaration`             | 77             | 75  | 74  | 73                   | 74            | 72         | 73               | 74          | Utilisable          | Moyenne  |
| Déclaration simple         | `/declaration-simple`      | 71             | 69  | 70  | 66                   | 68            | 68         | 67               | 68          | Utilisable          | Moyenne  |
| Comparaison interne        | Interne uniquement         | 58             | 56  | 55  | 53                   | 55            | 54         | 52               | 55          | Fonctionnel partiel | Moyenne  |
| Méthodologie               | `/methodologie`            | 74             | 72  | 72  | 75                   | 70            | 67         | 76               | 72          | Utilisable          | Moyenne  |
| Observatoire public        | `/observatoire`            | 82             | 80  | 81  | 80                   | 78            | 75         | 78               | 79          | Presque prêt        | Basse    |
| Onboarding localisation    | `/onboarding/localisation` | 57             | 55  | 54  | 53                   | 55            | 58         | 50               | 54          | Fonctionnel partiel | Moyenne  |
| Parcours personnalisé      | `/parcours`                | 56             | 54  | 53  | 52                   | 53            | 58         | 49               | 53          | Fonctionnel partiel | Moyenne  |
| Parcours profil            | `/parcours/[profile]`      | 61             | 59  | 58  | 56                   | 58            | 60         | 54               | 58          | Fonctionnel partiel | Moyenne  |
| Pilotage réseau            | `/partners/dashboard`      | 73             | 71  | 70  | 69                   | 70            | 68         | 71               | 70          | Utilisable          | Haute    |
| Réseau local               | `/partners/network`        | 82             | 80  | 82  | 83                   | 80            | 77         | 79               | 80          | Presque prêt        | Basse    |
| Parcours partenaire        | `/partners/onboarding`     | 64             | 62  | 62  | 60                   | 62            | 61         | 59               | 61          | Fonctionnel partiel | Haute    |
| Rapport imprimable         | `/prints/report`           | 82             | 80  | 81  | 79                   | 78            | 76         | 78               | 79          | Presque prêt        | Moyenne  |
| Profil racine              | `/profil`                  | 56             | 54  | 53  | 52                   | 53            | 58         | 49               | 53          | Fonctionnel partiel | Moyenne  |
| Profil dynamique           | `/profil/[profile]`        | 63             | 61  | 60  | 58                   | 60            | 60         | 55               | 60          | Fonctionnel partiel | Moyenne  |
| Carte d'impact personnelle | `/profil/impact`           | 66             | 64  | 64  | 62                   | 63            | 61         | 60               | 63          | Utilisable          | Moyenne  |
| Signalement terrain        | `/signalement`             | 76             | 74  | 74  | 72                   | 74            | 70         | 71               | 73          | Utilisable          | Haute    |
| Portail sponsors           | `/sponsor-portal`          | 82             | 80  | 81  | 81                   | 78            | 75         | 77               | 79          | Presque prêt        | Moyenne  |
| Section dynamique          | `/sections/[sectionId]`    | 69             | 66  | 66  | 63                   | 65            | 64         | 68               | 66          | À vérifier          | Haute    |
| Itinéraire IA              | `/sections/route`          | 74             | 72  | 72  | 70                   | 71            | 68         | 69               | 71          | Utilisable          | Haute    |
| Connexion Clerk            | `/sign-in/[[...sign-in]]`  | 42             | 41  | 40  | 38                   | 40            | 50         | 35               | 41          | À vérifier          | Haute    |
| Inscription Clerk          | `/sign-up/[[...sign-up]]`  | 42             | 41  | 40  | 38                   | 40            | 50         | 35               | 41          | À vérifier          | Haute    |


## Détail par rubrique

Le registre de navigation contient **26 rubriques visibles**. La rubrique `history` existe dans le registre mais reste cachée (`availability: hidden`), donc elle n'est pas comptée dans les rubriques accessibles ci-dessous.

Note de deuxième passe: `/actions/history` est bien une page existante. En revanche, son entrée de rubrique est cachée dans le registre, ce qui signifie que son exposition exacte dans la navigation doit être vérifiée en runtime.


| Page/Rubrique            | Route                     | Fonctionnalité | UX  | UI  | Direction artistique | Accessibilité | Robustesse | Documentation/IA | Score moyen | Statut              | Priorité |
| ------------------------ | ------------------------- | -------------- | --- | --- | -------------------- | ------------- | ---------- | ---------------- | ----------- | ------------------- | -------- |
| Profil & impact          | `/profil`                 | 56             | 54  | 53  | 52                   | 53            | 58         | 49               | 53          | Fonctionnel partiel | Moyenne  |
| Tableau de bord          | `/dashboard`              | 78             | 76  | 76  | 73                   | 75            | 71         | 74               | 75          | Utilisable          | Haute    |
| Rapports d'impact        | `/reports`                | 80             | 78  | 78  | 75                   | 77            | 73         | 78               | 77          | Utilisable          | Moyenne  |
| Administration           | `/admin`                  | 75             | 73  | 72  | 70                   | 72            | 68         | 71               | 71          | Utilisable          | Haute    |
| Déclarer une action      | `/actions/new`            | 80             | 78  | 77  | 75                   | 78            | 74         | 77               | 77          | Utilisable          | Moyenne  |
| Carte des actions        | `/actions/map`            | 79             | 77  | 78  | 76                   | 76            | 72         | 75               | 76          | Utilisable          | Moyenne  |
| Visualiser la carte      | `/sections/sandbox`       | 74             | 72  | 71  | 70                   | 71            | 68         | 69               | 71          | Utilisable          | Haute    |
| Itinéraire IA            | `/sections/route`         | 74             | 72  | 72  | 70                   | 71            | 68         | 69               | 71          | Utilisable          | Haute    |
| Seconde vie              | `/sections/recycling`     | 71             | 69  | 69  | 68                   | 69            | 66         | 67               | 68          | Utilisable          | Moyenne  |
| Comprendre l'Enjeu       | `/sections/climate`       | 73             | 71  | 72  | 72                   | 70            | 67         | 73               | 71          | Utilisable          | Moyenne  |
| Météo                    | `/sections/weather`       | 68             | 66  | 67  | 65                   | 67            | 64         | 63               | 66          | Utilisable          | Moyenne  |
| Mode d'emploi            | `/sections/guide`         | 75             | 73  | 73  | 72                   | 72            | 69         | 71               | 72          | Utilisable          | Moyenne  |
| Opérations collectives   | `/sections/community`     | 77             | 75  | 75  | 74                   | 74            | 71         | 72               | 74          | Utilisable          | Moyenne  |
| Classement               | `/sections/gamification`  | 75             | 73  | 73  | 71                   | 72            | 69         | 71               | 72          | Utilisable          | Moyenne  |
| Partenaires              | `/sections/actors`        | 76             | 74  | 74  | 73                   | 74            | 70         | 71               | 73          | Utilisable          | Moyenne  |
| Réseau Engagé            | `/sections/annuaire`      | 82             | 80  | 81  | 80                   | 80            | 77         | 79               | 80          | Presque prêt        | Basse    |
| Messages privés          | `/sections/dm`            | 72             | 70  | 71  | 68                   | 70            | 67         | 68               | 69          | Utilisable          | Moyenne  |
| Discussions              | `/sections/messagerie`    | 73             | 71  | 72  | 69                   | 71            | 68         | 69               | 70          | Utilisable          | Moyenne  |
| Données ouvertes         | `/sections/open-data`     | 81             | 79  | 80  | 78                   | 78            | 75         | 77               | 78          | Utilisable          | Moyenne  |
| Financement / sponsoring | `/sections/funding`       | 78             | 76  | 77  | 75                   | 76            | 73         | 74               | 75          | Utilisable          | Moyenne  |
| Signalement Déchets      | `/sections/trash-spotter` | 76             | 74  | 75  | 73                   | 74            | 70         | 71               | 73          | Utilisable          | Moyenne  |
| Découvrir le réseau      | `/partners/network`       | 82             | 80  | 82  | 83                   | 80            | 77         | 79               | 80          | Presque prêt        | Basse    |
| Point de départ (Apprendre) | `/learn/hub`              | 82             | 80  | 83  | 84                   | 79            | 75         | 79               | 80          | Presque prêt        | Basse    |
| Portail Décideur         | `/sponsor-portal`         | 82             | 80  | 81  | 81                   | 78            | 75         | 77               | 79          | Presque prêt        | Moyenne  |
| God Mode                 | `/admin/godmode`          | 55             | 52  | 54  | 57                   | 52            | 60         | 47               | 54          | Fonctionnel partiel | Haute    |


## Priorités recommandées

1. Geler le périmètre public de la V1: garder seulement les routes qui peuvent être comprises sans aide et sans rupture visuelle.
2. Écarter du périmètre public tout ce qui reste fragile: `admin/forms`, `admin/godmode`, `sign-in`, `sign-up`, `onboarding/localisation`, la comparaison interne des formulaires, `profil`, `parcours`, `parcours/[profile]`, `sections/[sectionId]`.
3. Nettoyer en priorité les surfaces visibles de l'entrée de site: accueil, Explorer, point de départ (Apprendre), rapports, actions, réseau.
4. Simplifier les écrans encore trop "bulles / cartes / encadrés" avant toute ouverture publique.
5. Normaliser les états de vide, d'erreur, de chargement et les retours de formulaire sur les pages réellement exposables.

## Points bloquants ou incertitudes

- En lecture publique stricte, le score global est plutôt autour de **54/100**. La valeur **63/100** reste une lecture optimiste des écrans les plus centraux.
- Les routes API sous `/api` ne sont pas notées individuellement, car elles ne correspondent pas à des pages ou rubriques affichées.
- `/sections/route` existe comme route dédiée et cohabite avec la route dynamique `/sections/[sectionId]`; l'exposition exacte dans les menus doit être vérifiée visuellement.
- Les pages `sign-in/[[...sign-in]]` et `sign-up/[[...sign-up]]` dépendent fortement de Clerk; l'expérience finale n'est pas entièrement évaluable depuis le code seul.
- `sections/[sectionId]` est une route dynamique: la qualité finale dépend de chaque rubrique rendue derrière `SectionRenderer`.
- `profil`, `parcours` et leurs variantes dynamiques agissent surtout comme des routes de redirection ou des shells de profil; leur valeur produit doit être vérifiée au runtime.
- `actions/history` existe mais est masquée dans le registre de navigation, donc sa visibilité produit reste volontairement réduite.
- `admin/forms` mélange encore des libellés et une structure plus faibles que le reste du back-office.

## Plan d'exécution immédiat pour une V1 publique

### Phase 1 - Cadrage de sortie

1. Figer le périmètre public à 8 à 10 routes maximum.
   - Garder: `/`, `/explorer`, `/learn/hub`, `/reports`, `/actions/new`, `/actions/map`, `/observatoire`, `/prints/report`, `/partners/network`, `/sponsor-portal`.
   - Mettre hors vitrine publique: `/admin`, `/admin/forms`, `/admin/godmode`, `/profil`, `/parcours`, `/onboarding/localisation`, la comparaison interne des formulaires, `/sign-in`, `/sign-up`, les routes dynamiques non garanties.
2. Décider explicitement ce qui est public, ce qui est interne, et ce qui est caché dans la navigation.
3. Marquer dans le code les pages non publicables comme secondaires ou hors menu principal.

### Phase 2 - Simplification visuelle globale

1. Finaliser les tokens de couleur et de surface pour éliminer les fonds trop sombres et les textes trop blancs.
2. Réduire le nombre de cartes superposées sur chaque page.
3. Remplacer les conteneurs trop fermés par des sections ouvertes, des bandes lisibles et des séparations plus légères.
4. Uniformiser les boutons, badges, champs et encadrés avec moins de contraste brutal et moins d'effets de bloc.

### Phase 3 - Nettoiement des pages publiques

1. Accueil: clarifier la promesse, alléger les blocs et supprimer les surcouches décoratives inutiles.
2. Explorer: garder une lecture rapide du site, réduire les panneaux trop denses et vérifier les contrastes.
3. Learn hub: conserver le contenu, mais casser la répétition des cartes et étaler davantage les sections.
4. Reports: supprimer les encadrés trop lourds, renforcer la hiérarchie et alléger les tableaux.
5. Actions: simplifier les formulaires et réduire la sensation d'interface administrative.
6. Réseau: garder l'exploration, mais réduire les couches visuelles et les micro-blocs décoratifs.

### Phase 4 - Fiabilisation fonctionnelle

1. Vérifier les formulaires publics avec des états vide, erreur, validation et succès réellement lisibles.
2. Contrôler les routes dépendantes de Clerk et des profils: elles ne doivent pas casser l'expérience si l'utilisateur est hors contexte.
3. Fermer les pages non essentielles qui restent trop incertaines au runtime.
4. Vérifier les redirections, retours et CTA de sortie partout où une page mène à une action.

### Phase 5 - Contrôle qualité avant publication

1. Faire une passe de cohérence sur les textes, labels et CTA.
2. Vérifier les contrastes sur les pages publiques les plus visibles.
3. Vérifier les états mobile et desktop sur les routes de sortie.
4. Supprimer toute page ou section qui ne sert pas la première impression publique.
5. N'ouvrir la publication qu'après validation des 10 routes retenues, pas avant.

## Priorités IA recommandées

### Modèle léger

- Harmoniser les textes de CTA sur les pages les plus simples.
- Corriger les empty states et les labels ambigus.
- Ajouter ou améliorer les `aria-label` manquants.
- Raccourcir les descriptions trop longues sur les cartes et les blocs.
- Rédiger des notes courtes de documentation pour les pages les plus utilitaires.

### Modèle intermédiaire

- Améliorer le responsive des pages de tableau de bord, d'admin et de parcours.
- Uniformiser les composants locaux entre les pages similaires.
- Corriger les petits écarts TypeScript ou de props.
- Rééquilibrer la hiérarchie visuelle des rubriques secondaires.
- Nettoyer les états loading, empty et error des pages les plus chargées.

### Modèle fort

- Refactorer la logique de navigation et les registres de rubriques si l'uniformisation devient nécessaire.
- Modulariser les pages très longues du dashboard, de l'admin et des rapports.
- Repenser les flux d'authentification et de redirection.
- Normaliser les schémas de données et les contrats entre front et API.
- Travailler la robustesse globale des écrans dépendants de Clerk ou des données serveur.
