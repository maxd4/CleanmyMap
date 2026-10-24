# Annuaire des acteurs — présentation détaillée

**Statut : `CURRENT`**

Cette fiche décrit uniquement le comportement actuellement porté par la route
`/sections/annuaire`. Elle ne vaut pas preuve d'un déploiement particulier : la preuve
de production doit être recherchée séparément.

## 1. Comprendre l'objet de l'annuaire

La page est une surface publique de découverte. Elle présente des ressources
éditoriales et des fiches de structures partenaires acceptées ; elle ne délivre pas de
certification, ne mesure pas automatiquement l'impact des acteurs et ne constitue pas un registre
exhaustif des organisations.

Le parcours visible est le suivant :

1. une introduction explique l'objet de l'annuaire ;
2. une sélection d'acteurs mis en avant facilite une première découverte ;
3. l'exploration permet de rechercher, filtrer et changer de représentation ;
4. une fiche permet de consulter les informations publiques et le canal de contact ;
5. le CTA final conduit vers la demande de référencement.

La mise en avant est une sélection éditoriale (`isFeatured`). Elle ne modifie pas la
provenance ni le niveau de confiance de l'entrée sélectionnée.

## 2. Recherche, filtres et résultats

`useAnnuaireLogic` est le propriétaire unique de l'état et des résultats de la page.
La saisie est normalisée sans distinction de casse ni d'accents, puis découpée en
termes séparés par des espaces, une ponctuation ou un tiret. Chaque terme doit être
présent comme sous-chaîne dans au moins un champ public du nom, de l'identité légale,
de la description, de la localisation, des tags et, lorsqu'ils existent, de la mission,
des besoins récurrents, des actions passées ou du libellé et de la description des
ressources utiles. Les termes peuvent donc être répartis entre plusieurs champs et
saisis dans n'importe quel ordre. Les contacts administratifs, identifiants et
métadonnées de modération ne sont pas recherchés.

Les filtres actuellement disponibles sont :

- le type de structure ;
- le domaine d'engagement (`Environnement`, `Social`, `Humanitaire` ou `Domaine non renseigné`) ;
- le type de contribution ;
- le périmètre géographique (`Tout Paris`, un arrondissement ou `Proches de moi` lorsque la préférence de localisation le permet).

Les filtres sont combinables. Ils pilotent la liste, la carte, le graphe et le compteur
de résultats ; la liste est paginée. Un état vide propose de réinitialiser les filtres
ou de rejoindre le référencement. La sélection d'une fiche mise en avant rétablit une
vue compatible avant d'ouvrir cette fiche : une sélection n'est pas perdue parce qu'un
filtre précédent l'excluait.

Le sélecteur de domaine est une classification fiable, distincte de la recherche textuelle.
Les trois boutons `Environnement`, `Social` et `Humanitaire` appliquent ce filtre structuré ;
les boutons `Propreté`, `Climat` et `Sensibilisation` restent des mots-clés de recherche.
`Domaine non renseigné` regroupe notamment les fiches partenaires historiques dont les
anciens `types` étaient dérivés du type d'organisation sans déclaration explicite.
Tous les filtres s'appliquent ensemble, réinitialisent la page courante et alimentent la
liste, la carte, le graphe et le compteur avec le même résultat. La sélection active est
conservée tant que sa fiche reste dans le résultat.

## 3. Fiches, contacts et provenance

Une fiche s'ouvre de façon cohérente depuis la sélection mise en avant, la liste, un
marqueur de carte ou un nœud du graphe. Le drawer expose les informations publiques
disponibles, la couverture déclarée, les repères de confiance et les ressources
publiables.

Le CTA de contact n'utilise qu'une destination web publique validée (`http` ou
`https`). Une ressource ou un site absent n'est pas remplacé par `#`. S'il n'existe
aucun canal public autorisé, le CTA est présenté comme indisponible. Un email, un
téléphone ou une autre coordonnée de contact administratif du formulaire ne devient
jamais public par le seul fait qu'il est syntaxiquement valide.

Les deux provenances ont des contrats différents :

La propriété historique `types` reste disponible pour les badges, popups et autres
consommateurs d'affichage. Elle n'est une preuve de classement thématique que lorsqu'une
source explicite l'accompagne : `engagementTypesSource=editorial_seed` pour une
classification éditoriale du dépôt ou `engagementTypesSource=partner_declaration` pour
une déclaration de la structure persistée pendant l'onboarding. Ces domaines sont
éditoriaux ou auto-déclarés ; ils ne constituent pas une certification.

### `editorial_seed`

Cette provenance correspond à une ressource éditoriale curatée dans le dépôt. Elle
est présentée comme `Ressource éditoriale` et conserve son statut de vérification en
cours et de contact non qualifié. Elle ne peut pas fournir, par elle-même, une
structure active, un partenaire confirmé, une collaboration, une activité récente ou
un historique d'impact mesuré. La fiche éditoriale de l'Académie du Climat reste
présente avec ses liens publics ; aucun panneau d'événements statiques ni promesse de
synchronisation n'est associé à cette fiche.

### `published_partner`

Cette provenance correspond à la projection publique d'une demande partenaire
persistée. La fiche peut porter les statuts de vérification, de qualification, de
disponibilité et de fraîcheur prévus par le contrat. Elle n'est visible par l'API et
la lecture publique qu'après une décision administrative `accepted`.

Le rapprochement entre les deux sources se fait sur l'identifiant stable canonique.
Un nom similaire ou une identité légale textuellement proche ne suffit pas à fusionner
ou masquer deux entrées. Si un identifiant stable est partagé, la projection partenaire
est prioritaire afin qu'un seed éditorial ne recouvre pas une décision persistée.

## 4. Carte et limites géographiques

La carte Leaflet ne place un marqueur que lorsque les coordonnées sont précises et
éligibles. Les coordonnées nulles, dérivées d'une couverture, les centroïdes connus de
la France ou de Paris et les entrées de portée nationale sont exclus des marqueurs
précis. La carte peut rester centrée sur Paris comme vue initiale ; ce centre n'est pas
présenté comme l'adresse d'une organisation.

Les fiches `local` peuvent afficher leur couverture d'arrondissements. Les fiches
`national` ou `france` restent visibles dans les listes et sont signalées comme de
portée nationale, sans être artificiellement transformées en acteurs locaux. Une
distance n'est affichée que si l'entrée possède des coordonnées précises et si une
préférence d'arrondissement permet de lui donner un sens ; aucune distance n'est
calculée depuis un centroïde ou une couverture abstraite.

## 5. Graphe et sémantique des liens

Le graphe est une vue d'exploration. Ses nœuds ouvrent les mêmes fiches que la liste
et la carte, y compris au clavier. Un lien est déduit uniquement de tags communs et
est présenté comme une **similarité thématique**. Il ne constitue pas une preuve de
collaboration, de partenariat, de co-organisation ou de relation opérationnelle.
Les positions visuelles des nœuds servent à la lisibilité du graphe et ne sont pas des
coordonnées géographiques.

## 6. Référencement et publication

Le CTA `Référencer ma structure` ouvre `/partners/onboarding`. La soumission demande
un compte connecté et valide les champs propres au formulaire ; la complétion générale
du profil n'est pas un prérequis global.

La demande et la fiche annuaire associée sont créées par la persistance Supabase
canonique et idempotente. Une reprise avec la même clé retrouve la demande existante.
Le formulaire propose zéro, un ou plusieurs domaines d'engagement. La déclaration est
validée côté serveur, conservée sur la demande source et recopiée dans la projection
publique seulement avec sa provenance explicite ; elle ne modifie ni les droits ni la
qualification administrative.
Après création, la fiche reste en attente de revue administrative. La revue autorisée
conserve la décision, la fiche, la demande source et l'audit dans la même opération
Supabase en mode persistant. Le fallback local est un chemin distinct et ne doit pas
être interprété comme la preuve d'une transaction Supabase.

Une décision `accepted` est la condition de publication. Les demandes en attente ou
rejetées ne sont pas exposées par l'API publique. Les demandes historiques peuvent
faire l'objet d'une réconciliation non destructive ; celle-ci ne supprime pas les
données et ne réécrit pas une décision existante.

## 7. Accès, confidentialité et erreurs

- La consultation de la route est publique.
- La soumission du référencement est protégée côté serveur par l'accès créateur et l'authentification Clerk.
- La revue du statut de publication est réservée à l'accès administrateur autorisé et est auditée.
- Les coordonnées administratives et l'identité de l'auteur de la revue ne font pas partie de la projection publique.
- Une indisponibilité de la lecture publique renvoie une vraie erreur HTTP (`503`) ; elle ne se transforme pas en réponse `200` contenant une liste vide.

Les états de chargement, l'état vide, l'absence de coordonnées, l'absence de canal
public et l'indisponibilité de la source sont des états distincts. Le drawer est rendu
hors des conteneurs de la carte, avec rôle de dialogue, nom accessible, fermeture par
Escape et backdrop, gestion du focus et restitution du focus au déclencheur lorsque
c'est possible.
Les fiches partenaires distinguent la disponibilité et les contributions déclarées,
la mise à jour administrative et les preuves d'activité. Une disponibilité hebdomadaire
ne crée pas une récurrence d'actions ; une date de mise à jour ne crée pas une dernière
action. Les actions passées et l'impact mesuré restent absents ou affichés comme non
renseignés tant qu'une source traçable et sa provenance ne sont pas disponibles.
