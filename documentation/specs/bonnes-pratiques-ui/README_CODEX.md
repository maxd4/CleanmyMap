# Bonnes pratiques : candidat de refonte Web

**Statut : PLAN / CANDIDATE.** Aucun code runtime intégré ni déployé par cette publication.

Base analysée : `75603b489223ff7eaaf27ebaa0f21dd75882c817`. Chemins cibles contrôlés sur `e8c9e76609e7cdc3c3de4d59d7e12106658adbbc`. La capture de la page existante est un état initial, non une maquette cible.

## Décisions produit et architecture

EXTEND_EXISTING : conserver les quatre identifiants de thème `tri`, `compost`, `reduire`, `numerique`, dans cet ordre, le paramètre URL, les ancres `guides-courts` et `ressources-utiles`, la page canonique, les composants et les owners existants. Aucun nouveau moteur, registre de couleur, table, API ou migration. Les candidats Vulgarisation et S'entraîner n'ont aucun chemin cible en commun avec celui-ci. La palette plus claire vient du registre partagé du candidat Vulgarisation, sans duplication.

- En-tête et onglets compacts, styles de famille canoniques, pictogrammes signifiants, clavier et relations ARIA préservés. Panneau actif seul rendu ; les panneaux inactifs ont un identifiant cible masqué. Chargement explicite plutôt que faux onglets inertes.
- Bien trier : guide et carte des actions (libellé fidèle à la route), exemples de filières, instructions locales, contexte et cas limites dans le thème seul. Ne pas collecter les déchets dangereux/inconnus. Le signalement vise les déchets abandonnés et non le simple doute de tri.
- Composter : guide et consignes biodéchets, combinaison humide/sec et aération, conseils si trop humide ou sec. Pas de fausse mesure d'humidité ni de ratio universel. L'action de collecte reste dans le thème adapté.
- Éviter les déchets abandonnés : guides puis quatre situations réelles de la campagne Gestes Propres (une seule projection), études nationales déclaratives et action collective conservées. Les liens bouteille/meuble mènent aux consignes ADEME adaptées ; la carte des actions reste accessible pour sa véritable fonction.
- Sobriété numérique : tutoriel Gmail en premier, puis faits, estimations et limites, sources/méthode. Les deux équations affichent distinctement la masse CO₂e et l'équivalent en km ; aucun changement des facteurs existants ni de leurs valeurs dérivées. Supprimer un mail déjà transmis n'annule pas les émissions passées.
- Ressources communes dans un disclosure identifié après le thème actif ; exclure du catalogue les deux éclairages déjà détaillés dans le tri. Les autres sources et repères restent disponibles. La navigation secondaire compacte reste en fin de page.

Les visuels partenaires non autorisés ne sont pas intégrés. Les chiffres et interprétations du baromètre, IFOP, facteurs numériques, quiz et données CleanMyMap ne sont pas modifiés. Aucun nouveau contenu éditorial non validé n'est présenté comme publié.

## Sources externes vérifiées le 25 novembre 2026

- ADEME, tri des emballages : https://quefairedemesdechets.ademe.fr/categories/emballages/
- ADEME, consignes du bac de tri : https://quefairedemesdechets.ademe.fr/reduction-des-dechets/tri-poubelle-jaune/
- ADEME, biodéchets : https://quefairedemesdechets.ademe.fr/categories/biodechets/dechets-alimentaires/
- ADEME, réussir son compost : https://agirpourlatransition.ademe.fr/particuliers/reduire-dechets/composter-pailler/regles-pour-reussir-compost
- ADEME, meubles et encombrants : https://quefairedemesdechets.ademe.fr/categories/meubles/

Reformulations pratiques concises, sans recopier les articles. Conserver les sources/validations Gestes Propres et Google déjà en place. Les sources nationales ne constituent pas des mesures de terrain CleanMyMap.

## Application

Consulter [01-bonnes-pratiques.patch](./01-bonnes-pratiques.patch) et [MANIFEST.json](./MANIFEST.json). Inspecter le checkout courant et les fichiers dirty/staged des autres writers. Lire les règles scoped, la documentation Next installée et les tests pertinents.

```sh
git apply --check documentation/specs/bonnes-pratiques-ui/01-bonnes-pratiques.patch
git apply documentation/specs/bonnes-pratiques-ui/01-bonnes-pratiques.patch
```

En cas d'écart réel, rapprocher les hunks compatibles sans écraser ni imposer de checkout historique. Ne pas transformer les documents CURRENT avant intégration effective. Les modifications d'index et de documentation du candidat ne sont pas une preuve de runtime.

## Validations requises

- Tests ciblés de route, tabs et URL, ressources Gestes Propres, contexte de tri, campagne, baromètre, IFOP et domaine numerique ; vérifier les tests de gouvernance éditoriale et les consommateurs des liens de campagne. Vérifier notamment absence de doublons en tri, maintien des six articles accessibles au total, quatre panneaux ARIA associés, aucun contexte tri hors tri, ordre guides avant campagne et baromètre, tutoriel avant équivalences, dimensions des deux équations.
- Typecheck, lint et tests Web proportionnés, contrôles documentaires et de complexité concernés. Si une baseline devient stale, traiter selon sa gouvernance, jamais assouplir les seuils. Couverture ciblée Web. Pas de FULL non demandé.
- Navigateur PUBLIC : sans bypass, sur host réellement annoncé. Desktop 1440/1920 et mobile 390 px, trois modes d'affichage, thème clair/sombre selon contrat, FR/EN, clavier flèches/Home/End et focus, lien direct theme=..., autres paramètres URL conservés. Vérifier les deux ancres externes, les guides et liens réels, contexte tri, les états ouverts/fermés, rendu des études, équations et tutoriel sans débordement. Captures des quatre onglets desktop et mobile. Pas d'auth ou d'accès backend ajouté.
- Vérifier la palette après intégration Vulgarisation et l'absence de régression sur les autres pages du bloc. Ne modifier ni les données des enquêtes, ni les facteurs CO₂, ni le moteur de quiz, ni les règles d'autorisations.
- Les tests existants et les assertions ajoutées restent des candidats jusqu'à exécution. Corriger seulement les défauts constatés.

## Preuves et limites

Vérification statique : lecture code/callers/tests, empreintes Git des 15 chemins, reconstruction des hunks et comparaison aux contenus candidats, vérification de non-recouvrement des deux candidats précédents, encodage et recherche ciblée de secrets. Aucun test runtime exécuté ; pas de preuve de compilation, rendu, contrastes réels ou navigation. `HOOK_NOT_AVAILABLE`, `git apply --check` réel, Vitest, lint, typecheck et navigateur : NOT_RUN ; couverture NOT_MEASURED.

**STOP CONDITION** : patch intégré sur le checkout courant, validations et captures réelles proportionnées réussies, documentation CURRENT synchronisée, publication fast-forward et relecture de main. Retirer uniquement ce candidat et son entrée d'index après consommation effective.
