# Partie VI — Utilité réelle de CleanMyMap {#partie-vi-utilite-reelle-de-cleanmymap}

## Finalité environnementale et sociale du projet

### Problème traité : déchets abandonnés, mégots, dépôts sauvages

CleanMyMap s'attaque à la pollution diffuse et aux dépôts sauvages qui dégradent les écosystèmes urbains et naturels. Chaque mégot jeté au sol peut polluer jusqu'à 1000 litres d'eau ; chaque dépôt sauvage constitue un risque sanitaire et environnemental.

### Publics concernés : citoyens, associations, collectivités

Le projet s'adresse aux citoyens souhaitant agir localement, aux associations de protection de l'environnement pour coordonner leurs cleanwalks, et aux collectivités pour identifier les zones critiques nécessitant une intervention institutionnelle.

### Transformation recherchée : signaler → organiser → nettoyer → prouver

L'objectif est de transformer une observation passive en action concrète. L'outil permet de documenter la pollution, d'organiser la réponse collective, d'exécuter le nettoyage et de produire une preuve d'impact (photos "avant/après").

### Contribution potentielle aux Objectifs de développement durable

Cette lecture ne sert pas de label automatique. Elle permet simplement de relier la finalité de CleanMyMap aux ODD les plus directement concernés.

| ODD                                           | Contribution potentielle de CleanMyMap                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| **ODD 11 — Villes durables**                  | meilleure localisation des déchets, coordination locale, cartographie d'usage    |
| **ODD 12 — Consommation responsable**         | meilleure traçabilité, réduction des doublons, sensibilisation aux déchets       |
| **ODD 13 — Climat**                           | pilotage plus sobre, meilleure coordination d'actions utiles                     |
| **ODD 14 et 15 — Vie aquatique et terrestre** | diminution locale de déchets abandonnés, documentation des zones touchées        |
| **ODD 17 — Partenariats**                     | meilleure coopération entre bénévoles, associations, collectifs et collectivités |

La cohérence du projet dépend donc autant de sa gouvernance, de sa sobriété et de sa réversibilité que de sa finalité affichée.

## Services rendus par le site

### Cartographier les zones polluées

Une carte interactive centralise les signalements, permettant de visualiser l'ampleur de la pollution sur un territoire donné.

### Organiser des cleanwalks et coordonner les bénévoles

Le site facilite la création d'événements de nettoyage, la gestion des inscriptions et la communication entre participants.

### Éviter les doublons, les pertes d'information et les déplacements inutiles

En affichant les actions en cours et les zones déjà traitées, l'outil optimise les efforts des bénévoles et réduit les trajets motorisés redondants.

### Produire des rapports exploitables pour les associations et collectivités

Produire des rapports ou exports (CSV/JSON) partageables, facilitant la transmission d'informations qualifiées aux associations ou collectivités locales.

### Créer un historique vérifiable des actions réalisées

Conserver la mémoire des zones nettoyées pour observer l'évolution de la pollution et l'efficacité des actions dans le temps.

## Utilité par usage réel

### Utilité par session utilisateur

Chaque consultation de la carte doit permettre de décider d'une action ou de valider un état de fait, justifiant ainsi le coût de la requête SWR et du rendu Leaflet.

### Utilité par bénévole mobilisé

L'outil accroît l'efficacité du bénévole en lui évitant de chercher des zones à nettoyer ou de doubler une action déjà faite.

### Utilité par association ou collectivité

La plateforme fournit des données consolidées pour le plaidoyer et l'amélioration des services de collecte.

### Utilité par signalement, photo ou donnée stockée

Le coût numérique d'une photo stockée (stockage, transfert) est justifié par sa valeur de preuve et de suivi temporel.

### Utilité par action de terrain effectivement réalisée

L'objectif reste de transformer des signalements dispersés en données localisées, modérées, exportables et utiles à l'action de terrain. Si une fonction ne débouche ni sur une décision, ni sur une coordination, ni sur une preuve exploitable, son utilité reste trop faible pour justifier son coût.

### Non-redondance avec des outils existants

CleanMyMap n'a de sens que s'il remplace ou améliore réellement des outils déjà disponibles ailleurs. S'il reproduit seulement des fonctions de WhatsApp, Google Sheets, Google Maps, des formulaires, ou de groupes Facebook sans gain clair, il ajoute une couche numérique supplémentaire sans bénéfice proportionné.

L'impact écologique dépend donc aussi de la non-redondance : le site doit centraliser, simplifier ou rendre plus fiable ce que les outils dispersés font mal, plutôt que de s'ajouter à eux. La règle à retenir est simple : pas de duplication fonctionnelle sans valeur d'usage démontrable.

Cette exigence est lisible dans le code du site : les flux de déclaration, de carte, d'historique, de rapport et d'apprentissage existent déjà dans `apps/web/src/app/(app)/actions/new/page.tsx`, `apps/web/src/app/(app)/actions/map/page.tsx`, `apps/web/src/app/(app)/actions/history/page.tsx`, `apps/web/src/app/reports/page.tsx` et `apps/web/src/app/learn/hub/page.tsx`. L'ajout d'une fonction IA ne se justifie donc que si elle remplace un bricolage dispersé par une consolidation réellement utile.

### IA et environnement social du bénévolat

L'IA peut aider à mieux organiser les bénévoles, à regrouper les signalements, à éviter les doublons et à fluidifier la préparation d'une cleanwalk. Dans ce cadre, elle peut renforcer l'efficacité collective sans remplacer le lien social qui fait la valeur du bénévolat.

Le risque apparaît lorsque l'automatisation prend la place des interactions humaines : réponses générées à la place d'un accueil, tri automatique qui remplace la discussion, ou coordination trop mécanique qui réduit l'engagement à une suite de tâches. Pour CleanMyMap, l'IA doit donc rester un support d'organisation, pas un substitut au collectif.

### IA et confiance dans CleanMyMap

La confiance des utilisateurs dépend de la clarté du système. Ils doivent savoir ce qui est automatisé, ce qui est relu humainement, quelles données sont utilisées et quelles décisions ne sont jamais déléguées à l'IA.

Cette transparence n'est pas seulement une exigence réglementaire ou technique. Elle conditionne l'acceptabilité du projet : une plateforme qui masque ses automatismes fragilise sa crédibilité, alors qu'un projet qui explicite ses choix, ses limites et ses validations humaines renforce la confiance dans les signalements, les cartes et les rapports produits.

Cette logique est déjà visible dans le dépôt : la chaîne de progression mentionne explicitement `itineraire IA` dans `apps/web/src/lib/gamification/progression-leaderboard.ts`, tandis que `apps/web/src/app/politique-confidentialite/page.tsx` documente des champs concrets liés au trajet comme le `Point de départ / d'arrivée`, le `style d'itinéraire` et le `message d'ajustement éventuel`. L'IA intégrée au produit doit donc rester un outil visible, documenté et borné, pas une couche cachée.
