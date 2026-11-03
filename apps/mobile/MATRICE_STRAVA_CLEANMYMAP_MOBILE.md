# CleanMyMap Mobile : matrice fonctionnelle et UI inspirée de Strava

**Statut :** `BENCHMARK / PLAN`, document de conception, non contractuel pour le runtime
**Recherche :** 3 novembre 2026
**Référence dépôt :** `maxd4/CleanmyMap`, branche `main`, SHA consulté `753f1b6f1ebad934678d4a0d6db85f42bcad96a3`
**Horizon :** réévaluation après stabilisation des parcours web, estimée vers septembre 2027, sans engagement de livraison
**Destination recommandée :** `apps/mobile/MATRICE_STRAVA_CLEANMYMAP_MOBILE.md` ; créer un renvoi depuis `apps/mobile/README.md` lors d'une éventuelle intégration

## 1. Vision produit et méthode

**Ambition : faire de CleanMyMap le « Strava des cleanwalks ».** L'expérience doit donner envie de découvrir une action, participer sur le terrain, enregistrer une trace, documenter ce qui a réellement été collecté, consulter son historique, partager une contribution et revenir agir avec sa communauté.

Le benchmark distingue trois dimensions :

- **Strava observé :** fonctionnalité et pattern d'interface rapportés par les sources officielles récentes, complétés par leurs visuels publics.
- **CleanMyMap souhaité :** adaptation au ramassage de déchets, aux signalements, aux équipes, aux actions et à leurs preuves. Il s'agit d'une orientation produit, **pas d'une fonctionnalité déjà validée**.
- **Mobile actuel :** état observable du code et de la documentation au SHA indiqué, **pas une preuve de fonctionnement en production**. L'app est actuellement `NOT_PRODUCTION_READY`.

**Convention « reprendre tel quel » :** reprendre **le pattern d'expérience et la composition** (ordre des blocs, hiérarchie, navigation, geste, état visuel, forme de fiche). **Adapter** le vocabulaire, les données, la couleur, la marque et les permissions à CleanMyMap. Ne pas recopier les logos, illustrations, captures, textes propriétaires ni l'identité visuelle protégée de Strava.

Les capacités Strava réservées à un abonnement et les disponibilités par plateforme peuvent évoluer. La matrice porte sur l'expérience observée en novembre 2026, sans impliquer une tarification identique pour CleanMyMap.

### Légende

- **Reprise UI :** `R` = reproduire au plus près un pattern UX générique ; `A` = adapter la fonction au terrain ; `R+A` = les deux.
- **Mobile :** `NATIF` = présent en code ; `PARTIEL` = capacité proche mais surface incomplète ; `PONT WEB` = ouverture du site ; `PLAN` = non implémenté nativement. Tous les états `NATIF` doivent être validés sur appareils réels avant diffusion.
- **Priorité cible :** `P0` = cœur du parcours, `P1` = expérience sociale et rétention, `P2` = approfondissement. Ce sont des priorités **proposées**, non une roadmap approuvée.
- **Sources :** codes `[S01]` à `[S22]`, liens vérifiables en section 8.

## 2. Architecture d'information et système UI cible

### 2.1 Navigation

La navigation Strava observée repose sur cinq destinations persistantes : **Home / Maps / Record / Groups / You** ([S01], [S07], [S10]). Sa logique est particulièrement adaptée à CleanMyMap.

| Élément UI Strava | Reprise | Adaptation CleanMyMap | État mobile |
|---|---|---|---|
| Barre inférieure à cinq entrées, pictogramme et libellé court | R+A | **Accueil · Carte · Agir · Réseau · Profil** à étudier à terme ; `Agir` devient l'entrée de création/enregistrement de cleanwalk. | PARTIEL : `Agir · Carte · Compte` sont les trois onglets actuels. |
| Destination centrale dédiée à l'enregistrement | R+A | Accès immédiat à **Démarrer une cleanwalk** ; distinction avec **Créer / rejoindre une action**. | PARTIEL : CTA GPS dans `Agir`. |
| Barre haute contextualisée, recherche, messages, cloche | R+A | Recherche d'actions ou d'acteurs, messages et notifications du compte. | PARTIEL / PONT WEB. |
| Onglets secondaires sur une page, contrôles segmentés | R | `Activités / Progrès`, `Actions / Défis / Acteurs`, `Carte / Liste` selon la surface. | PARTIEL. |
| Détail ouvert depuis une fiche, retour conservant contexte et scroll | R | Fiche action, bilan, profil, groupe, signalement, itinéraire. | PARTIEL. |
| Navigation par feuille coulissante au-dessus d'une carte | R+A | Détails d'une action ou d'un point de déchets, sans perdre le fond cartographique. | PLAN. |
| Recherche et filtres sous forme de chips et de panneau dédié | R+A | Localisation, date, statut, type d'action, accessibilité, catégorie de déchet. | PARTIEL pour les listes, PLAN sur la carte native. |
| Thème clair/sombre cohérent et hiérarchie contrastée | R+A | Garder les tokens propres à CleanMyMap ; privilégier la lisibilité en extérieur. | PARTIEL : app native sombre actuelle. |

**Proposition de shell futur, non à implémenter maintenant :**

```text
┌─────────────────────────────────────┐
│ CleanMyMap            Recherche  ♧ │
│ [titre de la surface]                │
│                                     │
│  Contenu principal / carte / feed    │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Accueil   Carte   AGIR   Réseau  Moi │
└─────────────────────────────────────┘
```

Le shell actuel reste la référence exécutable : `apps/mobile/screens/mobile-shell.tsx` et `mobile-shell-contract.ts`. La cible à cinq entrées ne constitue pas un ordre de modification immédiate. `Apprendre` peut rester un parcours secondaire ; sa place définitive dépendra du produit web stabilisé.

### 2.2 Langage visuel à reprendre

| Pattern Strava | Ce qui doit être proche | Traduction UI CleanMyMap |
|---|---|---|
| Carte d'activité dans un flux | Avatar + nom + contexte/date ; titre ; carte ou photo dominante ; 2 à 4 mesures ; réactions et commentaires en pied | Organisateur et participants ; titre de cleanwalk ; tracé ou photo terrain ; temps, distance et résultats **réellement déclarés/validés** ; réactions. |
| Fiche d'activité | Grand titre, identités, métriques majeures, carte cliquable puis sections de détails | Fiche cleanwalk avec état, parcours, bilan, photos, participants, provenance, modération. |
| Enregistrement plein écran | Chiffres très lisibles, bouton principal accessible au pouce, bascule carte/stats | Chronomètre de mission, tracé GPS, précision et synchronisation, pause, fin, accès sécurité. |
| Vue Carte de découverte | Carte dominante, recherche et filtres en surcouche, bottom sheet | Déchets signalés, actions futures, cleanwalks réalisées, géométries autorisées et légende. |
| Page de club | Bannière, identité, description, chiffres, sous-onglets, événements | Association ou collectif, zone d'action, membres, cleanwalks, événements et discussions. |
| Page Profil | Avatar, indicateurs synthétiques, calendrier, graphiques, badges, historique | Contributions personnelles, régularité, actions confirmées, traces publiables, preuves et badges vérifiables. |
| Défi | Grande image d'en-tête, objectif, progression, participants et classement | Défi local ou collectif de dépollution ; progression calculée uniquement sur contributions admissibles. |
| Partage d'activité | Carte ou photo avec métriques superposées ; feuille de partage native | Carte souvenir de cleanwalk, données qualifiées, lien public selon confidentialité. |
| États de données | Skeleton/chargement, vide contextualisé, statut d'opération, actions de reprise | **Brouillon, transmission en attente, reçu par serveur, à modérer, validé** doivent rester distincts. |

## 3. Matrice des fonctionnalités et de leurs adaptations UI

### A. Accueil, flux et découverte sociale

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| A01 | Fil d'activités personnel et des personnes suivies | Flux vertical de cartes riches | Flux des cleanwalks publiées, actions à venir et contributions des acteurs suivis, selon visibilité. | PLAN | P0 | [S02], [S03] |
| A02 | Carte d'activité illustrée avec carte GPS ou photo | Média dominant, titre, avatar, statistiques courtes | Carte de cleanwalk avec photo ou tracé, date, lieu, organisateur et bilan admissible. | PLAN | P0 | [S02] |
| A03 | Affichage de synthèses de progression dans l'univers personnel | Indicateurs en tête, accès au détail | Résumé de contribution, activité récente et prochaines participations. | PARTIEL | P1 | [S04], [S05] |
| A04 | Fil filtré par ses propres activités, abonnements et clubs | Filtre compact, sélection mémorisée | Mes actions, réseau suivi, associations locales. | PLAN | P1 | [S03] |
| A05 | « Kudos » sur une activité | Action simple et visible sous la carte | Encouragement à un bénévole ou une cleanwalk, sans le confondre avec une validation d'impact. | PLAN | P1 | [S02] |
| A06 | Commentaires associés à une activité | CTA et fil de commentaires sous la fiche | Commentaires sur une action selon les permissions et la modération canoniques. | PONT WEB pour les discussions | P1 | [S02], [S15] |
| A07 | Publication avec images, description et contexte | Bloc média puis texte expandable | Journal de terrain illustré par des photos autorisées et des observations. | PLAN | P1 | [S02], [S07] |
| A08 | Flux et actions partageables | Icône de partage près de la fiche | Lien vers une action, un bilan publié ou une invitation autorisée. | PARTIEL | P1 | [S16] |
| A09 | Recherche transversale | Loupe en haut et résultats par catégories | Actions, lieux, collectifs, profils publics, signalements visibles. | PONT WEB | P1 | [S07] |
| A10 | Accès aux notifications depuis l'accueil | Cloche en haut à droite et compteur | Réponses d'inscription, changements d'action, messages, résultat de modération. | PARTIEL : préférences seulement | P0 | [S17] |

### B. Enregistrement d'une cleanwalk, GPS et terrain

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| B01 | Onglet « Enregistrer » et bouton Démarrer | Écran dédié, CTA primaire au bas | Démarrer une mission de cleanwalk depuis `Agir`, avec contexte d'action si disponible. | NATIF | P0 | [S01] |
| B02 | Sélecteur de sport avant l'activité | Picker compact au-dessus du CTA | Sélecteur futur de **mode terrain** seulement si des contrats distincts sont définis (cleanwalk, observation, action collective). | PLAN | P2 | [S01] |
| B03 | Bascule pendant l'activité entre carte et statistiques | Carte plein écran et panneau de chiffres repliable | GPS, durée, distance et trace ; synchronisation et statut de mission visibles. | PARTIEL | P0 | [S01] |
| B04 | Boutons Pause / Reprendre / Terminer | Contrôles persistants, grandes zones tactiles | Pause volontaire et clôture explicite, en préservant les données déjà enregistrées. | PARTIEL : arrêt/finalisation présents | P0 | [S01] |
| B05 | Indicateur de précision GPS | Halo de précision et état de localisation | Qualité de localisation et explication du risque d'erreur terrain. | PARTIEL | P0 | [S01] |
| B06 | Reprise de séance et fonctionnement hors ligne | État de connexion discret, reprise sans perte | Buffer owner-scoped, synchronisation idempotente, statut des points en attente. | NATIF en code, non validé opérationnellement | P0 | [S01], [S18] |
| B07 | Chargement et suivi d'un itinéraire enregistré | Tracé de référence superposé à la trace live | Itinéraire prévu d'action, départ, rendez-vous et tracé réellement parcouru distincts. | PLAN | P1 | [S11], [S12] |
| B08 | Alerte de sortie d'itinéraire | Alerte contextuelle sur la carte | Information de déviation si une géométrie prévue existe et si le guidage est pertinent. | PLAN | P2 | [S01] |
| B09 | Beacon, partage volontaire de position en direct | Feuille « sécurité », contacts de confiance, lien temporaire | Position en direct **sur consentement explicite** et pour une mission active ; contrôle strict de l'accès et durée. | PARTIEL : contact d'urgence et appel natifs, sans partage live | P1 | [S13] |
| B10 | Écran de fin avec titre, description, photos et visibilité | Formulaire post-activité simple, étapes de confirmation | Fin GPS puis lien éventuel avec le **bilan réel** ; la finalisation GPS ne prouve pas l'impact déchets. | PARTIEL | P0 | [S01] |
| B11 | Ajout de médias à une activité | Sélecteur photo et galerie sous la fiche | Photos d'action et de déchets, provenance et droits d'accès cohérents avec le backend. | PARTIEL : photos de signalement natives | P0 | [S01], [S02] |
| B12 | Écran d'activité exploitant l'appareil en extérieur | Chiffres grands et contraste fort | Lecture à une main, à la lumière du jour, pendant les gants et déplacements. | PARTIEL | P0 | [S01] |

### C. Fiche d'activité et bilan après cleanwalk

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| C01 | Page détaillée d'activité | Header auteur/date/titre, résumé, sections verticales | Page canonique de participation ou de cleanwalk terminée. | PARTIEL : détail d'action simplifié | P0 | [S02] |
| C02 | Carte d'activité ouvrant la carte plein écran | Vignette cartographique cliquable | Trace GPS, géométrie de l'action et points pertinents visibles selon accès. | PARTIEL : carte mission native | P0 | [S02] |
| C03 | Mesures majeures immédiatement lisibles | 2 à 4 valeurs fortes au-dessus de la ligne de flottaison | Durée, distance, participants réellement présents, masse et mégots **si mesurés/confirmés**. | PARTIEL : activité/compte | P0 | [S02] |
| C04 | Détails secondaires par sections | Sous-sections repliables et détails à la demande | Déchets par catégories, provenance, conditions de terrain, qualité et validation. | PLAN | P0 | [S02] |
| C05 | Participants associés à une activité | Avatars et liste cliquable | Inscrits, présents et contributeurs **distincts** ; rôles et consentements respectés. | PARTIEL | P0 | [S02] |
| C06 | Description, titre, tags et photos | Partie éditoriale sous les métriques | Récit de cleanwalk, notes, photos et légende des résultats. | PARTIEL | P1 | [S02] |
| C07 | Édition d'activité | Menu `…` puis écran de modification | Modifier uniquement les champs autorisés et l'état éditable de l'action ; respecter l'historique de modération. | PARTIEL : édition préparation d'action | P1 | [S02] |
| C08 | Activité complétée puis consultable dans l'historique | Passage de la fin à la fiche sauvegardée | Séparer **mission GPS terminée**, **bilan soumis**, **bilan approuvé** et **publication**. | PARTIEL | P0 | [S01], [S02] |
| C09 | Partage de statistiques sur une photo/carte | Visuel de partage généré depuis la fiche | Carte de bilan partageable avec métriques qualifiées et source d'action. | PLAN | P1 | [S16], [S18] |
| C10 | Replay animé d'un parcours | Animation progressive de la trace | Relecture d'une cleanwalk sur les segments réellement enregistrés. | PLAN | P2 | [S19] |

### D. Carte, découverte locale et itinéraires

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| D01 | Onglet Cartes de découverte | Carte immersive principale | Carte native des actions, signalements et données cartographiques publiques admissibles. | PONT WEB (`/actions/map`) | P0 | [S10], [S20] |
| D02 | Sélecteur de mode de carte | Choix de couche dans un contrôle flottant | Actions, déchets signalés, traces publiques et résultats selon les couches canoniques. | PONT WEB | P0 | [S20] |
| D03 | Filtres liés au lieu et à l'activité | Chips + panneau de filtres sur la carte | Date, secteur, type, disponibilité, catégories, états et données de qualité. | PONT WEB | P0 | [S10] |
| D04 | Fiche surgissant depuis un élément de carte | Bottom sheet avec titre, aperçu et CTA | Fiche de l'action ou du signalement, avec CTA `Rejoindre` ou `Voir`. | PLAN | P0 | [S10], [S12] |
| D05 | Recherche de lieux et d'itinéraires | Barre de recherche sur carte | Trouver une action, un secteur à nettoyer et un point de rendez-vous. | PONT WEB / PARTIEL liste | P0 | [S10], [S21] |
| D06 | Découverte d'événements à proximité | Liste filtrable à partir d'une carte/zone | Cleanwalks prochaines près de l'utilisateur ou de son territoire sélectionné. | PARTIEL liste, PLAN sur carte | P0 | [S07] |
| D07 | Points d'intérêt affichés sur carte | Épingles typées et légende | Points de rendez-vous, accès, lieux utiles et points de déchets selon la provenance. | PLAN | P1 | [S21] |
| D08 | Création d'un itinéraire par points | Toucher carte, ajouter/déplacer un point, confirmation | Préparer l'itinéraire ou la zone d'une action, en réutilisant l'owner itinéraire web. | PARTIEL : topologie/coordonnées sans éditeur | P1 | [S11] |
| D09 | Dessin de parcours sur carte | Geste de dessin et correction | Adapter les outils de tracé opérationnels futurs sans créer de moteur concurrent. | PLAN | P1 | [S11] |
| D10 | Aperçu de parcours et fiche d'itinéraire | Distance, carte, photos, terrain, détails | Aperçu du parcours d'une cleanwalk, conditions et contraintes accessibles si disponibles. | PLAN | P1 | [S18] |
| D11 | Itinéraires enregistrés | Liste personnelle et bouton Démarrer | Retrouver les itinéraires d'actions, les ouvrir dans le suivi terrain. | PLAN | P1 | [S12] |
| D12 | Navigation vers le début d'un itinéraire | CTA ouvrant l'application de navigation | Guidage vers le lieu de rendez-vous et ses informations pratiques. | PLAN | P1 | [S12] |
| D13 | Cartes ou itinéraires accessibles hors ligne | Préchargement identifié et état hors ligne | Prévoir les données indispensables au terrain hors réseau ; distinguer cache et données à jour. | PARTIEL : buffer GPS uniquement | P1 | [S18] |
| D14 | Carte d'activités personnelle (heatmap) | Carte globale des parcours personnels | Visualisation historique des zones parcourues ou actions effectuées, selon confidentialité. | PLAN | P2 | [S22] |
| D15 | Segments et espaces géographiques remarquables | Fiche de zone, historique, progression | **Secteurs de dépollution** et historique de contribution avec règles de qualité ; ne pas déduire une zone « nettoyée » du seul passage GPS. | PLAN | P2 | [S23] |
| D16 | Recherche d'itinéraires en langage naturel | Champ libre et fiches de résultats | Recherche future de cleanwalks ou secteurs selon des critères validés par le produit, sans promettre un moteur IA. | PLAN | P2 | [S18] |

### E. Actions, événements, clubs et collectifs

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| E01 | Galerie d'événements à découvrir | Cartes avec date, image, lieu et type | Liste des cleanwalks publiées et éligibles à l'inscription. | NATIF, listes simplifiées | P0 | [S07], [S08] |
| E02 | Fiche événement complète | Bannière, organisateur, date, adresse, parcours, participants | Fiche d'action avec programme et informations pratiques canoniques. | PARTIEL | P0 | [S08] |
| E03 | Réponse « Je participe » / se désinscrire | CTA primaire et état confirmé/en attente | Demande, confirmation, invitation et annulation selon le cycle serveur. | NATIF | P0 | [S08] |
| E04 | Places disponibles, état complet | Badge disponibilité et CTA contextualisé | Capacité annoncée, inscriptions ouvertes/fermées et statut de participation. | PARTIEL | P1 | [S08] |
| E05 | Création d'événement de club | Étapes courtes, progression, récapitulatif | Création de cleanwalk à partir des contrats Actions web. | NATIF, formulaire de préparation | P0 | [S08] |
| E06 | Gestion des événements organisés | Menu d'actions, liste des inscrits, changements | Gestion de l'action, demandes, participants, invitations et préparation. | PARTIEL | P0 | [S08] |
| E07 | Coorganisation de clubs | Double identité organisateur et invitation | Coorganisateurs autorisés d'une action, rôles et validation par le serveur. | PARTIEL | P1 | [S24] |
| E08 | Rappels avant événement | Notification liée à la fiche d'événement | Rappel du rendez-vous, matériel et mise à jour des informations pratiques. | PLAN : préférences de notification seules | P0 | [S07] |
| E09 | Page détaillée d'un club | Bannière, avatar/logo, chiffres, carrousel de sous-sections | Profil d'association/collectif, périmètre, cleanwalks, membres et publications. | PONT WEB pour l'annuaire | P1 | [S06] |
| E10 | Rechercher / rejoindre / suivre un club | Loupe, filtres, statut membre ou demande en attente | Recherche d'associations et relation communautaire selon les contrats futurs. | PONT WEB | P1 | [S06] |
| E11 | Statistiques et classement de club | Cartes de chiffres et tableau simple | Bilan collectif vérifié par période, sans confondre participation et collecte prouvée. | PLAN | P1 | [S06] |
| E12 | Publications et annonces de club | Flux interne, carte annonce, avatar | Actualités des collectifs et appels à bénévoles, selon la modération. | PONT WEB | P1 | [S06], [S15] |
| E13 | Flyers d’événements prêts à partager | Affiche générée depuis la fiche événement, visuel, date et CTA Partager | Affiche d'une cleanwalk avec identité du collectif, lieu, date, lien d'inscription et tracé autorisé. | PLAN | P1 | [S27] |
| E14 | Statistiques d'événement après sa tenue | Récapitulatif chiffré rattaché à la fiche | Comparer inscriptions, présence attestée et résultats de collecte, **sans inférer la présence de la seule proximité GPS**. | PARTIEL | P1 | [S28] |

### F. Messagerie, coordination et notifications

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| F01 | Messagerie privée | Liste de conversations, avatars, compteur non lu | Échanges autorisés entre acteurs et bénévoles. | PONT WEB | P1 | [S14] |
| F02 | Conversation de groupe | Fil vertical, champ de saisie fixe | Discussion pour préparer et coordonner une cleanwalk. | PONT WEB | P1 | [S14] |
| F03 | Messagerie de club organisée par canaux | Liste de salons avec intitulé et état non lu | Canaux des collectifs ou actions selon la structure canonique des discussions. | PONT WEB | P1 | [S15] |
| F04 | Annonces administrateur | Message mis en avant et auteur identifié | Consignes officielles des organisateurs, sans assimilation à une décision administrative validée. | PONT WEB | P1 | [S15] |
| F05 | Réponses, réactions et sondages dans les fils | Long press, menu contextuel, sondage compact | Coordination terrain et consultation communautaire. | PONT WEB | P1 | [S15] |
| F06 | Partage d'itinéraire, d'activité et d'événement dans la conversation | Aperçu intégré à un message | Partage interne d'action, de carte ou de bilan public admissible. | PONT WEB | P1 | [S14], [S15] |
| F07 | Centre de notifications | Liste chronologique, lu/non lu, ouverture ciblée | Inscriptions, rappels, invitations, messages, modération et suivi. | PARTIEL : préférences, pas de boîte native | P0 | [S17] |
| F08 | Notifications push configurables | Paramètres par famille d'événements | Notifications Android/iOS après vérification permission et contrat serveur. | PLAN | P1 | [S17] |
| F09 | Préférences par canal / club | Icône de réglage sur chaque conversation | Mise en sourdine des discussions ou collectifs. | PLAN | P2 | [S15] |
| F10 | Signalement et modération de messages | Menu contextualisé et confirmation | Réutiliser les flux de signalement et permissions de modération canoniques. | PONT WEB | P1 | [S15] |

### G. Profil, activité, statistiques et progression

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| G01 | Onglet Vous, sections Progrès et Activités | Entête identité puis sous-onglets | Profil et progression CleanMyMap avec historique personnel complet. | PARTIEL : hub Compte | P0 | [S04], [S05] |
| G02 | Page de profil avec avatar, bio et club | Header profil et liens contextuels | Identité affichable, collectif, rôle actif, préférences de visibilité. | PARTIEL | P0 | [S04] |
| G03 | Indicateurs hebdomadaires / mensuels | Statistiques condensées et graphique | Nombre d'actions, durée, distance et métriques d'impact qualifiées. | PARTIEL : quelques KPI serveur | P1 | [S04], [S05] |
| G04 | Calendrier d'activités | Grille par jour et périodes sélectionnables | Journées de cleanwalk, participation, actions organisées et périodes sans données. | PLAN | P1 | [S04] |
| G05 | Histogramme interactif de progression | Colonnes temporelles et sélection de période | Historique temporel de contribution, sans estimation environnementale implicite. | PLAN | P1 | [S04], [S05] |
| G06 | Recherche dans l'historique | Loupe, filtres et liste d'activités | Retrouvez actions, missions GPS, signalements et bilans selon visibilité. | PARTIEL : listes bornées Compte | P1 | [S05] |
| G07 | Objectifs personnalisés | Carte objectif, progression, période, édition | Objectifs de participation, de régularité ou de collecte **uniquement si vérifiables**. | PLAN | P1 | [S25] |
| G08 | Galerie de défis et inscription | Carte défi avec échéance et CTA Rejoindre | Défis individuels, collectifs ou territoriaux fondés sur des critères transparents. | PLAN | P1 | [S09] |
| G09 | Progression de défi | Barre de progression et état d'éligibilité | Avancement de contributions validées, preuve et limites explicitées. | PLAN | P1 | [S09] |
| G10 | Badges et trophées | Galerie de badges par catégorie | Reconnaissance de participation, régularité, contribution vérifiée, coorganisation. | PARTIEL : niveau affiché, pas galerie native | P1 | [S04], [S09] |
| G11 | Classements collectifs | Liste de positions et filtres de période | Reconnaissance contextualisée par territoire et collectif ; préserver équité et qualité. | PLAN | P2 | [S06], [S23] |
| G12 | Récapitulatif narratif d'une période | Cartes partageables et parcours récapitulatif | « Votre mois/année de cleanwalks » avec données attribuables et clairement qualifiées. | PLAN | P2 | [S18], [S16] |
| G13 | Carte personnelle de parcours | Historique spatial avec filtres | Lieux de cleanwalk parcourus, selon visibilité et anonymisation adaptée. | PLAN | P2 | [S22] |
| G14 | Rapports détaillés | Fiche de résultat et accès au document | Liste et consultation des rapports d'impact **générés côté serveur**. | PLAN | P1 | [S05] (pattern d'historique) |
| G15 | « Local Legend » et récurrence territoriale | Badge sur la zone, période et nombre de participations | Reconnaissance d'engagement régulier sur un secteur, fondée sur des cleanwalks admissibles et sans récompense du simple passage GPS. | PLAN | P2 | [S29] |
| G16 | « Meilleurs efforts » et records personnels | Carte de trophée, historique et comparaison avec soi-même | Étapes de contribution personnelle vérifiée, évolution du temps consacré et de la participation ; ne pas classer la vitesse de ramassage. | PLAN | P2 | [S30] |
| G17 | Bannières d'accomplissement contextualisées dans le flux | Carte mise en avant à l'occasion d'un jalon | Mise en avant d'une contribution, d'un défi collectif ou d'une période d'engagement attestés. | PLAN | P2 | [S31] |

### H. Confidentialité, fiabilité et paramètres

| ID | Fonctionnalité Strava | UI à reprendre | Adaptation CleanMyMap | Mobile | Priorité | Source |
|---|---|---|---|---|---|---|
| H01 | Contrôle de visibilité par activité | Choix explicite sur la fiche et à l'édition | Confidentialité de la mission, du profil et des contenus publiables, selon les permissions réelles. | PARTIEL | P0 | [S02], [S26] |
| H02 | Masquage de portions de carte | Éditeur de visibilité associé à la trace | Protection des trajets privés, lieux sensibles et positions de bénévoles. | PLAN | P0 | [S26] |
| H03 | Paramètres par défaut de confidentialité | Réglage global et exceptions par activité | Confidentialité cohérente entre GPS mobile, espace personnel et carte publique. | PARTIEL : paramètres de compte | P0 | [S26] |
| H04 | Paramètres de notifications par catégorie | Écran de préférences et interrupteurs | Rappels d'action, événements, messages et actualités ; reliés aux réglages serveur. | PARTIEL | P1 | [S17] |
| H05 | Paramètres de compte et d'affichage | Entrées de menu claires, libellés et retours d'état | Profil, langue, notification, consentements, affichage, demande RGPD. | PARTIEL | P1 | [S17] |
| H06 | Réglages liés à la position et au partage de sécurité | Consentement contextualisé avant le démarrage | Autorisations GPS, accès d'urgence, partage volontaire, durée de validité. | PARTIEL | P0 | [S13], [S26] |

## 4. Fiches UI prioritaires à maquetter

### Écran 1. Accueil : flux de cleanwalks

**Référence :** le fil d'activités Strava ([S02], [S03]).

1. Header compact : logo CleanMyMap, recherche, messages, notifications.
2. Accès aux actions proches et aux prochaines inscriptions, sans surcharger le header.
3. Flux de **cartes d'activité** : auteur, date, titre, carte ou photos, mesures publiables, réaction, commentaire, partage.
4. Actions futures rendues comme **cartes d'événement**, pas comme une cleanwalk déjà réalisée.
5. État vide utile : découvrir des cleanwalks ou suivre un collectif.

### Écran 2. Carte : explorer son territoire

**Référence :** onglet Cartes, filtres, calques et fiches d'itinéraire Strava ([S10], [S11], [S20], [S21]).

1. Carte occupant l'écran disponible, sans grands panneaux fixes.
2. Recherche et filtres compacts superposés en haut ; contrôle de couches séparé.
3. Un appui sur une épingle ouvre une **bottom sheet**, sans quitter la carte.
4. La fiche développe le titre, le type de donnée, l'état, la date, le lieu et un CTA vers la ressource autorisée.
5. Afficher explicitement la différence entre **action prévue**, **trace GPS observée**, **déchet signalé** et **résultat validé**.

### Écran 3. Agir : enregistrer une cleanwalk

**Référence :** écran Record, bascule carte/statistiques, CTA d'enregistrement Strava ([S01]).

1. Écran immersif de mission, carte et trace en arrière-plan.
2. Durée principale très visible ; distance et état GPS/synchronisation en second niveau.
3. Contrôles accessibles au pouce : démarrer, pause/reprendre si disponible, terminer.
4. Accès sécurité sans sortir du suivi ; états GPS, connexion et reprise compréhensibles.
5. Après arrêt, transition explicite entre **fin du suivi GPS** et **déclaration du bilan** : ne pas afficher « cleanwalk validée » sur simple arrêt GPS.

### Écran 4. Cleanwalk : page de résultat

**Référence :** page d'activité et partage Strava ([S02], [S16]).

1. Titre, organisateur, date, lieu et état de publication/validation.
2. Bloc de chiffres principaux, tous sourcés et qualifiés.
3. Grande carte cliquable du parcours et photos.
4. Groupes secondaires : participants, déchets, preuves, contexte, historique de statut.
5. Réactions et partage si l'action est accessible, sans remplacer les règles de modération.

### Écran 5. Réseau : collectif et événement

**Référence :** détail de club et événements Strava ([S06], [S07], [S08]).

1. Bannière et identité de l'association/collectif, zone géographique, chiffres et suivi.
2. Bande d'entrées : présentation, cleanwalks, membres, événements, discussions.
3. Cartes événements avec date/heure/lieu et état de participation.
4. Détail d'action avec CTA d'inscription et informations pratiques.
5. Conversations et annonces associées via le système de messagerie canonique.

### Écran 6. Profil : progression individuelle

**Référence :** `You > Progress / Activities` et profil Strava ([S04], [S05]).

1. Identité, portrait ou avatar, rôle et collectif.
2. Deux sous-onglets `Progression` / `Activités`.
3. KPI de contribution réelle sur période, graphique, calendrier.
4. Badges, défis, historique avec recherche et filtres.
5. Accès au détail de chaque action, et aux rapports serveur disponibles.

### Écran 7. Défi : contribution collective

**Référence :** challenges Strava ([S09]).

1. Visuel d'en-tête, nom, territoire, échéance, règles d'éligibilité.
2. CTA d'inscription et barre de progression lisible.
3. Contributions prises en compte et contributions encore en vérification distinguées.
4. Communauté participante, valorisation des collectifs et partage.
5. Aucune conversion automatique entre GPS, nombre de personnes et déchets collectés.

## 5. Matrice d'exécution différée

**Décision actuelle : documentation et maquettes statiques seulement.** Ne pas construire aujourd'hui les futures API, écrans métier, tables, packages partagés, calculateurs ou composants complexes pour coller artificiellement au benchmark. La cible UI sera revalidée après stabilisation du web.

| Phase | Objet | Contenu autorisé | Critère de sortie |
|---|---|---|---|
| `NOW / BENCHMARK` | Référentiel produit | Cette matrice, liens vers références, labels `CURRENT`/`PLAN`, priorités proposées. | Sources vérifiables, aucune fonctionnalité inventée comme livrée. |
| `NOW / STATIC UI` | Écrans d'attente | Titre, sous-titre, description brève, mention « En préparation », navigation retour, pas d'API. | Aucun parcours métier opérationnel remplacé. |
| `WEB STABLE / REVIEW` | Confrontation aux contrats web | Vérifier propriétaires de données, endpoints, règles métier, accès et ergonomie finale. | Contrats observés, arbitrages datés ; pas de nouvelle source de vérité. |
| `MOBILE DELIVERY` | Intégration lot par lot | UI native autonome, adaptateurs minimaux, tests et validations plateformes. | Fonctionnalités réellement exercées et vérifiées, parité métier sans duplication. |

### Ordre conseillé des futurs lots

1. **Expérience centrale :** carte de découverte, enregistrement fiable, fin de cleanwalk et fiche bilan.
2. **Parcours action :** découvrir, rejoindre, organiser, coordonner, notifier.
3. **Communauté :** feed, réactions, clubs, conversations et partage.
4. **Engagement :** calendrier, objectifs, défis, progression, reconnaissances.
5. **Approfondissement :** routes enrichies, rétrospectives, rapports, visualisations territoriales.

Cet ordre reste dépendant de la maturité fonctionnelle et technique du site web.

## 6. Invariants spécifiques à CleanMyMap

| Invariant | Conséquence pour le design inspiré de Strava |
|---|---|
| **Une trace GPS ne mesure pas la quantité de déchets retirés.** | Distance/durée et résultats de ramassage sont séparés dans l'UI et les données. |
| **Une inscription n'est pas une présence attestée.** | États distincts : invité, demande en attente, confirmé, présent, contribution validée. |
| **Une déclaration n'est pas automatiquement un résultat publié ou validé.** | Badges de statut et texte de qualification accessibles sur toutes les fiches d'impact. |
| **Le serveur reste owner des calculs et de la modération.** | Les cartes et graphiques mobiles ne recalculent pas les impacts scientifiques et ne créent pas d'approximation locale. |
| **Les géolocalisations peuvent être sensibles.** | Visibilité explicite et contrôle d'accès, minimisation de la précision publique, protection des lieux privés. |
| **Les actions sont collectives, mais les contributions individuelles restent attribuées selon preuve.** | Éviter le double comptage dans les profils, clubs, défis et classements. |
| **L'app doit fonctionner pendant une activité extérieure.** | Forte lisibilité, interactions brèves, états réseau/GPS, conservation locale et reprise fiable. |
| **Le web et le mobile évoluent indépendamment en UI.** | Conserver un propriétaire métier canonique et une présentation mobile native, pas une reproduction technique du web. |
| **Le shell V1 et l'authentification actuels sont des contrats à préserver.** | Ne pas modifier la navigation, l'identité Clerk, les clés owner-scoped ou le suivi terrain sans lot justifié. |

## 7. Sources internes CleanMyMap vérifiées

- `apps/mobile/AGENTS.md` : frontière web/mobile, périmètre V1, états de production, navigation et identité.
- `apps/mobile/README.md` : état vérifié des écrans, GPS, services, appels HTTP et validations.
- `apps/mobile/screens/mobile-shell.tsx` et `mobile-shell-contract.ts` : 3 onglets, sous-vues `Agir`, pont carte web.
- `apps/mobile/screens/account.tsx` : profil, activité, indicateurs et notifications préférentielles.
- `apps/mobile/screens/action-join.tsx`, `action-create.tsx`, `signalement.tsx` : parcours natifs existants.
- `documentation/pages_site/INDEX.md` : inventaire canonique des surfaces web et statuts d'accès.
- `documentation/architecture/adr/ADR-003-monorepo-structure.md` : séparation UI et dépendances partagées.

*Cette revue a porté sur les fichiers GitHub et la documentation du dépôt, pas sur une exécution ou un test physique de l'application.*

## 8. Sources Strava et références visuelles

Priorité aux **sources officielles Strava**. Les articles Strava Stories contiennent des illustrations et captures d'interface consultables depuis leurs pages. Les détails exacts de l'UI peuvent varier avec les versions, les comptes, les plateformes et les expériences A/B.

| Code | Source officielle et référence d'écran | Usage dans la matrice |
|---|---|---|
| **S01** | [Comment enregistrer une activité sur Strava](https://support.strava.com/fr/articles/15402137-comment-enregistrer-une-activite-sur-strava) | Record, carte/statistiques, pause, fin, GPS, reprise, sortie d'itinéraire. |
| **S02** | [Affichage des activités](https://support.strava.com/fr/articles/15401943-affichage-des-activites) | Carte d'activité, fiche, participants, commentaires, édition, carte plein écran. |
| **S03** | [Visibilité des activités et flux](https://support.strava.com/en-us/articles/15401700-my-activities-are-set-to-everyone-where-does-that-data-go-on-strava) | Flux Accueil, abonnements, clubs, confidentialité. |
| **S04** | [Votre page profil Strava](https://support.strava.com/fr/articles/15402175-votre-page-profil-strava) | Profil, calendrier, trophées, photos et histogrammes. |
| **S05** | [Voir votre historique d'activité](https://support.strava.com/fr/articles/15402014-voir-votre-historique-d-activite-sur-strava) | `Vous > Progrès / Activités`, recherche et filtres. |
| **S06** | [Les clubs sur l'appli mobile](https://support.strava.com/fr/articles/15401837-les-clubs-sur-l-appli-mobile) | Création, adhésion, page club, statistiques et publications. |
| **S07** | [Nouveautés juillet 2026](https://stories.strava.com/articles/whats-new-on-strava-strava-connects-to-claude-new-running-events-and-races-and-club-messaging) | Découverte d'événements, messages de clubs, replay d'activité ; référence visuelle. |
| **S08** | [Événements de groupe pour les clubs](https://support.strava.com/fr/articles/15401898-evenements-de-groupe-pour-les-clubs) | Création, RSVP, modifications et partage des événements. |
| **S09** | [Les challenges Strava](https://support.strava.com/fr/articles/15401916-les-challenges-strava) | Galerie, participation, progression et règles de défi. |
| **S10** | [Mises à jour des segments et carte](https://support.strava.com/fr/articles/15401612-mises-a-jour-des-segments-segments-verifies-desencombrement-et-classement) | Sélecteur carte et découverte de secteurs. |
| **S11** | [Créer un itinéraire sur mobile](https://support.strava.com/fr/articles/15401660-comment-creer-un-itineraire-sur-l-application-mobile-strava) | Points de passage, dessin sur carte, édition et enregistrement. |
| **S12** | [Suivre un itinéraire](https://support.strava.com/fr/articles/15401749-comment-s-abonner-a-un-itineraire-sur-strava) | Itinéraire pendant l'enregistrement et bibliothèque personnelle. |
| **S13** | [Strava Beacon](https://support.strava.com/fr/articles/15401829-strava-beacon) | Sécurité et partage volontaire temporaire de la position. |
| **S14** | [Messagerie instantanée](https://support.strava.com/fr/articles/15401651-messagerie-instantanee-sur-strava) | DM et groupes. |
| **S15** | [Messages du club](https://support.strava.com/fr/articles/15401541-comment-utiliser-les-messages-du-club-sur-strava) | Canaux, annonces, réponses, sondages, modération, notifications. |
| **S16** | [Partager vos activités](https://support.strava.com/fr/articles/15401840-partager-vos-activites-strava) | Visuel carte/photo avec statistiques et feuille de partage native. |
| **S17** | [Gérer les notifications Strava](https://support.strava.com/fr/articles/15402139-comment-gerer-mes-notifications-strava) | Cloche, centre et préférences de push. |
| **S18** | [Nouveautés du 27 octobre 2026](https://stories.strava.com/pt/articles/whats-new-on-strava-log-strength-your-way-find-routes-in-your-own-words-and-explore-offline-mode) | Recherche naturelle d'itinéraire, preview enrichie, mode hors ligne, partage ; référence visuelle. |
| **S19** | [Nouveautés juillet 2026, Activity Replays](https://stories.strava.com/articles/whats-new-on-strava-strava-connects-to-claude-new-running-events-and-races-and-club-messaging) | Replay animé du tracé. |
| **S20** | [Calques cartographiques](https://support.strava.com/fr/articles/15401924-quels-sont-les-calques-cartographiques-disponibles-sur-strava) | Choix de calques et paramètres de carte. |
| **S21** | [Points d'intérêt et départs](https://support.strava.com/fr/articles/15401716-points-d-interet-et-points-de-depart) | POI, recherche et itinéraire vers une position. |
| **S22** | [Cartes d'activités personnelles](https://support.strava.com/fr/articles/16046277-cartes-d-activites-de-strava-le-guide) | Heatmap et filtres d'historique personnel. |
| **S23** | [Classements et segments](https://support.strava.com/fr/articles/15401771-comment-filtrer-les-classements-sur-les-segments-sur-strava) | Classement et filtres de période. |
| **S24** | [Coorganisation d'événements de club](https://support.strava.com/fr/articles/15401533-coorganisation-d-evenements-de-club) | Hôtes multiples et invitations de coorganisation. |
| **S25** | [Objectifs Strava](https://support.strava.com/fr/articles/15401848-les-objectifs-sur-le-site-internet-de-strava) | Objectifs personnels et suivi de progression. |
| **S26** | [Visibilité de la carte](https://support.strava.com/fr/articles/15402012-comment-modifier-la-visibilite-de-la-carte-sur-strava) | Confidentialité, masquage et configuration individuelle. |
| **S27** | [Flyers d'événements de club](https://support.strava.com/fr/articles/15401588-comment-creer-et-partager-un-flyer-pour-un-evenement-de-club) | Affiche d'événement, CTA partage, données et visuel issus de la fiche. |
| **S28** | [Statistiques d'événement de club](https://support.strava.com/fr/articles/15401581-les-statistiques-d-evenement-de-club) | Récapitulatif après événement et liaison au suivi GPS (principe à ne pas transposer automatiquement). |
| **S29** | [Local Legend](https://support.strava.com/fr/articles/15401751-qu-est-ce-que-la-performance-local-legend-sur-strava) | Distinction territoriale de régularité sur 90 jours. |
| **S30** | [Meilleurs efforts](https://support.strava.com/fr/articles/15401645-meilleurs-efforts-cyclisme) | Records personnels, historiques et comparaison dans le temps. |
| **S31** | [Données d'activité dans le flux](https://support.strava.com/fr/articles/15401664-les-donnees-d-activite-dans-le-flux) | Statistiques principales contextualisées et bannières d'accomplissement. |

### Références d'interface à regarder en premier

1. **[Nouveautés Strava juillet 2026](https://stories.strava.com/articles/whats-new-on-strava-strava-connects-to-claude-new-running-events-and-races-and-club-messaging)** : événements, groupes et replay.
2. **[Nouveautés Strava octobre 2026](https://stories.strava.com/pt/articles/whats-new-on-strava-log-strength-your-way-find-routes-in-your-own-words-and-explore-offline-mode)** : cartes, recherche, aperçus et offline.
3. **[Strava, clubs sur mobile](https://support.strava.com/fr/articles/15401837-les-clubs-sur-l-appli-mobile)** : fiche collectif et sous-onglets.
4. **[Strava, enregistrement GPS](https://support.strava.com/fr/articles/15402137-comment-enregistrer-une-activite-sur-strava)** : écran central `Record`.
5. **[Strava, profil et progrès](https://support.strava.com/fr/articles/15402175-votre-page-profil-strava)** : progression et historique.

---

**Synthèse de direction :** reprendre la **grammaire UX** de Strava (cinq espaces lisibles à terme, cartes d'activité, enregistrement GPS, fiches complètes, carte de découverte, clubs, progression et partage). Faire de la **cleanwalk attestée** l'unité centrale du produit et non de la performance sportive. Conserver l'application actuelle utilisable, documenter les évolutions à l'état `PLAN`, puis intégrer les capacités après stabilisation des contrats du site web.
