# CleanMyMap Mobile : guides de composition Strava × CleanMyMap

**Statut :** `BENCHMARK / PLAN` (aucune de ces fiches ne remplace un contrat métier `CURRENT`). Recherche et photos publiques : 3 novembre 2026.

Ces documents proposent **page par page** une composition de mobile natif, accessible et sombre par défaut. Chaque guide comporte **au moins une image Strava réellement publiée** et, pour six pages, un mockup CleanMyMap déjà généré. Les huit images Strava sont des visuels de la fiche Google Play et **ne constituent pas toutes une capture directe de la page correspondante** : voir [provenance](./REFERENCES_STRAVA.md).

## Couverture des pages

| ID | Page | État constaté sur `main` | Famille | Référence |
|---|---|---|---|---|
| 01 | [Accueil et fil de cleanwalks](./01-accueil-et-fil-de-cleanwalks.md) | `PLAN` | Accueil | Strava réelle |
| 02 | [Carte et exploration territoriale](./02-carte-et-exploration-territoriale.md) | `PONT WEB / PLAN` | Cartographie | Strava réelle |
| 03 | [Enregistrement GPS et mission active](./03-enregistrement-gps-et-mission-active.md) | `CURRENT PARTIEL` | Agir | Strava réelle |
| 04 | [Fin de mission et saisie du bilan](./04-fin-de-mission-et-saisie-du-bilan.md) | `PLAN` | Agir | Strava réelle |
| 05 | [Détail d’une cleanwalk achevée](./05-detail-d-une-cleanwalk-achevee.md) | `PARTIEL / PLAN` | Impact | Strava réelle |
| 06 | [Découvrir et rejoindre une action](./06-decouvrir-et-rejoindre-une-action.md) | `CURRENT PARTIEL` | Agir | Strava réelle |
| 07 | [Créer et préparer une action](./07-creer-et-preparer-une-action.md) | `CURRENT PARTIEL / PLAN` | Agir | Strava réelle |
| 08 | [Signaler un déchet](./08-signaler-un-dechet.md) | `CURRENT PARTIEL` | Agir | Strava réelle |
| 09 | [Historique des activités](./09-historique-des-activites.md) | `CURRENT RÉSUMÉ / PLAN` | Profil | Strava réelle |
| 10 | [Profil personnel](./10-profil-personnel.md) | `CURRENT PARTIEL` | Profil | Strava réelle |
| 11 | [Progression et statistiques](./11-progression-et-statistiques.md) | `PLAN` | Impact | Strava réelle |
| 12 | [Clubs et collectifs](./12-clubs-et-collectifs.md) | `PLAN / PONT WEB` | Réseau | Strava réelle |
| 13 | [Événements et calendrier de cleanwalks](./13-evenements-et-calendrier-de-cleanwalks.md) | `PLAN / CURRENT PARTIEL` | Réseau | Strava réelle |
| 14 | [Discussions et messagerie](./14-discussions-et-messagerie.md) | `PONT WEB / PLAN` | Réseau | Strava réelle |
| 15 | [Notifications et boîte de réception](./15-notifications-et-boite-de-reception.md) | `PLAN` | Profil | Strava réelle |
| 16 | [Itinéraires et préparation cartographique](./16-itineraires-et-preparation-cartographique.md) | `PLAN` | Cartographie | Strava réelle |
| 17 | [Défis et distinctions](./17-defis-et-distinctions.md) | `PLAN` | Réseau | Strava réelle |
| 18 | [Partage d’une cleanwalk](./18-partage-d-une-cleanwalk.md) | `PLAN` | Impact | Strava réelle |
| 19 | [Paramètres et confidentialité](./19-parametres-et-confidentialite.md) | `CURRENT PARTIEL / PLAN` | Profil | Strava réelle |
| 20 | [Gestion organisateur et invitations](./20-gestion-organisateur-et-invitations.md) | `CURRENT PARTIEL / PLAN` | Agir | Strava réelle |
| 21 | [Hub Agir](./21-hub-agir.md) | `CURRENT` | Agir | Strava réelle |
| 22 | [Hub Compte](./22-hub-compte.md) | `CURRENT` | Profil | Strava réelle |

## Instructions d’utilisation

1. Lire la [matrice globale](../MATRICE_STRAVA_CLEANMYMAP_MOBILE.md) comme benchmark, pas comme preuve runtime.
2. Choisir **une page et son lot** : ouvrir sa fiche, puis la référence Strava et le modèle CleanMyMap quand présent.
3. Contrôler le code et les contraintes `CURRENT` du mobile, les callers, consommateurs et les docs web canoniques avant toute implémentation.
4. Préserver les capacités opérationnelles natives et les ponts web; ne pas remplacer un parcours actif par une imitation visuelle.
5. Après intégration par Codex, contrôler l’écran sur émulateur et documenter les écarts nécessaires aux contrats réels.

## Gouvernance des captures et décision REA

Le référentiel est rattaché à la [matrice fonctionnelle et UI](../MATRICE_STRAVA_CLEANMYMAP_MOBILE.md), qui reste la source canonique des identifiants, priorités et adaptations CleanMyMap. Les guides et catalogues de ce dossier portent uniquement l'observation visuelle, la provenance et les limites.

Les huit visuels promotionnels déjà collectés sont conservés localement pour la comparaison UX, mais ne sont pas des assets publiables : les droits de redistribution dans le dépôt n'ont pas été démontrés. Les sources officielles et les emplacements locaux attendus sont décrits dans [l'inventaire de provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees). Aucun visuel tiers n'est utilisé par le runtime mobile.

La décision actuelle est de ne pas lancer de **REA (reverse engineering analysis)** ou de décompilation de Strava : l'effort serait disproportionné pour un objectif UX, les algorithmes et décisions serveur resteraient inconnus, et les contraintes contractuelles/juridiques sont incertaines. Une recherche REA ne sera réévaluée que pour un besoin technique précis, avec un fondement juridique explicite et un périmètre autorisé.

## Cohérence globale

- **Navigation actuelle :** `Agir`, `Carte`, `Compte`. Les cinq destinations inspirées de Strava restent une **option de roadmap**, jamais une modification automatique.
- **Thème :** sombre par défaut, contraste élevé. Palette issue de `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`; ne pas transférer les composants CSS web dans React Native.
- **Cartographie :** géométrie prévue ≠ tracé GPS réel ≠ signalement ≠ hypothèse de projection.
- **Impact :** mesuré ≠ déclaré ≠ dérivé ≠ proxy. Les chiffres et formules des maquettes sont fictifs.
- **Confidentialité :** pas de position en direct, nom de participant ou donnée privée sans autorisation explicite.
- **Droits des images :** les captures Strava sont des contenus de tiers pour le benchmark. Ne pas les utiliser comme assets runtime, ni présumer leur redistribution publique autorisée.

## Écart avec l’état réel

Les statuts de la table ont été vérifiés sur le `main` observé le 3 novembre 2026 (SHA `7a7862bee57dbfe0468687c4508119ae22be64e1`). Cette référence historique peut devenir obsolète ; relire `main` lors de chaque chantier. L’app reste `NOT_PRODUCTION_READY` selon `apps/mobile/README.md`.

## Sources

- `apps/mobile/README.md`, `apps/mobile/AGENTS.md`, `apps/mobile/screens/mobile-shell-contract.ts`
- `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`
- [Inventaire et provenance des images](./REFERENCES_STRAVA.md)

## Complément de recherche visuelle (3 novembre 2026)

Un [catalogue sourcé de captures et références ciblées](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md) documente 18 sources, dont des captures Strava officielles de clubs/événements 2026 et du mode sombre. Les guides individuels renvoient aux IDs correspondants. Une capture de page exacte n’a pas été vérifiée pour chaque sous-écran.
