# Prompt Codex : Lot 4/4, clôture produit et engagement terrain

**Type : LOT XL, finition fonctionnelle.** À exécuter après les lots 0 à 3. Ce lot ne recrée ni les formulaires, ni les imports, ni l'historique, ni le moteur de calcul. La route canonique `/learn/empreinte-ia` doit être créée dès le lot 1 ; si elle est absente à ce stade, c'est un objectif incomplet du lot 1 à résoudre sans créer de route parallèle.

```text
LOT 4/4 : « Mon empreinte IA », pédagogie, engagement terrain et intégration produit.

OBJECTIF
Clore un parcours Web public unique sur /learn/empreinte-ia, déjà alimenté par les lots 0 à 3. Compléter les explications et les passerelles vers Apprendre, Méthodologie, Mon espace et Actions, sans deuxième estimateur, stockage, quota ni gamification.

JALON 1 : PARCOURS ET SCIENCE VISIBLE
- Garder les deux entrées « Déclarer mon utilisation » et « Importer un relevé », puis une synthèse lisible des résultats et les modules privés déjà livrés (historique, budget, corrections). Détails scientifiques dépliables avec méthode/version, couverture, unités, source, scénario et NA ; distinguer texte, image, audio, vidéo selon la disponibilité réelle.
- Réutiliser le comparateur géographique du lot 0, sans recalculateur divergent : France/US et autres facteurs explicitement sourcés seulement, comparaison hypothétique à énergie identique. Région d'inférence inconnue = carbone attribuable NA, même si un scénario français est affiché. Eau/ACV distinctes ; aucune précision trompeuse.
- Expliquer l'électricité IT et le PUE, le mix électrique, l'eau directe/indirecte, les GPU et leur fabrication, les minerais, la chaîne d'approvisionnement et les enjeux sociaux, en séparant données globales et émissions personnellement attribuables. Sources primaires cliquables AIE, ADEME, EcoLogits et CNUCED lorsque pertinentes.
- Conseils de sobriété sobres, vérifiables et non culpabilisants : éviter répétitions inutiles, réutiliser les réponses, choisir un modèle adapté, réduire les générations lourdes si possible. Aucun pourcentage d'économie sans mesure ou source applicable.

JALON 2 : PASSAGE À L'ACTION
- Ajouter un module facultatif « Passer à l'action » avec cible personnalisable explicite : kg de déchets, nombre de mégots OU participation à une action. Ces cibles sont indépendantes de l'estimation CO2e ; ne jamais convertir un objectif en neutralisation, XP, récompense ou participation attestée.
- L'objectif proposé reste un état de formulaire local non persistant, sans nouvelle table, nouvelle preuve ni système de défi à suivre. Signaler qu'il n'est pas enregistré. La comparaison conventionnelle de 5 kg du lot 0 reste pédagogique, pas une obligation ou un rendement terrain.
- Réutiliser la découverte publique canonique des actions futures via /sections/rejoindre-une-action?tab=future et /actions/map. Proposer la commune choisie uniquement si le filtre public existant permet réellement de la transmettre ; sinon rediriger vers le filtre existant sans inventer de résultats géographiques ou dupliquer la recherche. Ne demander aucune géolocalisation automatique.
- Inscription, présence et éventuelle confirmation passent exclusivement par les parcours Actions existants. Aucun clic, objectif ou estimation ne valide une participation.

JALON 3 : NAVIGATION, UI ET DOCUMENTATION
- La route /learn/empreinte-ia est l'unique surface de calcul et suivi ; /methodologie conserve seulement la comparaison pédagogique/méthodologique du lot 0, sans formulaire personnel dupliqué. Ajouter liens réciproques entre les deux, et depuis /learn/comprendre vers cette page.
- Depuis /dashboard (« Mon espace », /profil n'étant qu'un alias), ajouter un accès à /learn/empreinte-ia#historique, visible aux comptes connectés. Préserver /admin/services, ses quotas et les snapshots du projet ; expliquer la différence entre empreinte personnelle et empreinte technique CleanMyMap.
- Conserver la page dans la famille Apprendre, palette jaune/ambre, PageHeader et composants CMM ; référencement/accessibilité adaptés à une page publique avec données privées facultatives. Ne pas créer de nouvelle rubrique primaire si un lien contextuel suffit. Respecter français/anglais, responsive, clavier, réductions de mouvement, modes exhaustif/minimaliste/sobre et la confidentialité des réponses côté serveur.
- Mettre à jour le registre de routes, la fiche CURRENT de /learn/empreinte-ia, les fiches des pages réellement modifiées et les liens scientifiques et de confidentialité nécessaires, sans dupliquer les contrats métier.

VALIDATIONS
Exécuter parcours navigateur anonyme/connecté, navigation aller-retour, import et déclaration existants sans régression, budget et historique owner-scoped, cas NA et région inconnue, scénarios, objectifs non persistés, liens vers actions futures, responsive mobile, clavier, trois modes, locale fr/en et absence de promesse de compensation. Tester l'absence de régression /methodologie, /dashboard, /learn/comprendre et /admin/services. Exécuter tests ciblés, typecheck, lint, couverture Web pertinente et contrôles documentaires ; distinguer les preuves exécutées des vérifications non réalisées.

STOP CONDITION
Une seule page /learn/empreinte-ia permet de calculer/importer et comprendre l'empreinte IA, retrouver son historique connecté, comparer des scénarios sans prétendre connaître la région réelle, choisir un objectif volontaire et accéder aux Actions. Aucun double comptage, duplicat de dashboard, donnée personnelle exposée, promesse de compensation ni système de gamification parallèle.
```

## Décisions non négociables

- **Route :** `/learn/empreinte-ia`, créée au **lot 1**, rattachée à la famille **Apprendre**, pas à la palette rouge de la Méthodologie.
- **Suivi :** historique et budget sont livrés au **lot 3**, pas développés à nouveau ici.
- **Comparaison :** la carte méthodologique du **lot 0** peut rester dans `/methodologie`, mais la page personnelle consomme le **même calcul pur** et la même version de facteurs.
- **Recherche locale :** le GET `/api/actions/group-join` vérifié au SHA `78a5f56d39be5ba7a9ccec64c69dbd1d5ec427dc` accepte `limit`, `historyLimit`, `actionId`, pas un paramètre `commune`. On utilise donc la surface de recherche publique existante, sans inventer de recherche serveur par commune.
- **Mon espace :** `/profil` est un alias du dashboard `/dashboard` ; le lien privé doit figurer dans le dashboard, pas dans deux vues parallèles.
- **Objectifs terrain :** formulaire pédagogique éphémère non sauvegardé. La persistance de véritables défis serait un autre produit et demanderait un contrat métier séparé ; elle ne fait pas partie de la clôture.
- **API privées :** la page publique ne doit jamais précharger un historique ni rendre son contenu disponible à un visiteur anonyme.