# Prompt Codex : Lot 3/3, suivi et budgets personnels

**Type : LOT XL / réécriture de l'ancien prompt « Suivi personnel ».** À exécuter après les lots 0, 1 et 2. Le ratio cleanwalk demeure pédagogique ; aucune dette carbone personnelle ou obligation de nettoyage n'est créée.

```text
LOT 3/3 : Historique personnel, budget de tokens et recalculs scientifiques explicites.

OBJECTIF
Compléter « Mon empreinte IA » avec un tableau de bord privé fiable à partir des déclarations et imports existants. Un seul owner métier, aucun nouveau quota fournisseur, aucune modification des snapshots publics ou de l'administration des services CleanMyMap.

JALON 1 : HISTORIQUE ET AGRÉGATS
- Historique privé consultable, trié et filtré par période, fournisseur, modèle, éditeur, opérateur, cloud/local, origine (manuel/import), modalité et statut actif/exclu/partiel. Détails de provenance et version de normalisation/méthode visibles.
- Totaux par mois UTC [début,fin[ : tokens entrants comprenant cache une seule fois, sorties et raisonnement selon sa relation d'inclusion, nombre de requêtes, coûts par devise sans conversion forcée, énergie et CO2e avec périmètre/provenance. Ne pas agréger les scopes doublons, buckets imbriqués, relevés incomplets ou périodes traversant deux mois sans ventilation sourcée ; montrer la couverture et les exclus.
- Tableau « Conflits » avec choix explicite de la source prioritaire (conserver le détail et exclure l'agrégat, ou inversement), correction, exclusion, restauration, suppression et réimport idempotent. Réconciliation persistante, pas de doublons de méthode ou de valeur historique.

JALON 2 : BUDGET ET VERSIONS
- Budget personnel mensuel facultatif en tokens, configuré par owner, avec avertissement paramétrable (défaut de présentation proposé 80 % uniquement si l'utilisateur active le budget), pourcentage et dépassement ; ce n'est PAS un quota fournisseur et ne bloque jamais les API tiers.
- Budget `tokens_logiques = inputTotal + outputTotal` après normalisation fournisseur et déduplication, uniquement si les deux composantes sont connues. Si couverture incomplète, afficher « consommation connue minimale / total non déterminable », pas une progression présentée comme exhaustive. Mois UTC, coûts séparés et pas de conversion financière en kWh.
- Recalcul volontaire et versionné avec les facteurs scientifiques courants : créer une nouvelle révision de résultat rattachée à la source personnelle sans écraser la précédente ; conserver version, facteurs, hypothèses et moment du recalcul, afficher ancien/nouveau et delta. Ne recalculer ni PDF historique, ni chiffres projets, ni lignes de tiers.

JALON 3 : UI, CONFIDENTIALITÉ ET DOCUMENTATION
- Composer une seule page avec Synthèse, Activité dans le temps, Répartition, Comparaison cleanwalk, Budget, Historique et Conflits. Graphiques accessibles, tableaux à unités, libellés « mesuré », « déclaré », « scénario » et « NA », indicateurs de couverture et source d'incertitude, boutons Modifier/Exclure/Supprimer/Recalculer.
- Afficher le ratio d'une action de référence 5 kg via le proxy terrain effectif ; ne jamais appeler cela une compensation, et ne pas générer de badges, XP ou crédits carbone. Anonyme : calculateur et explication, jamais l'historique privé. Responsive, clavier, mode sobre/minimaliste/exhaustif.
- Stocker uniquement le minimum personnel requis. Appliquer AuthN/AuthZ/RLS sur budgets, estimations et historique, y compris IDOR, caches interutilisateurs et tout nouvel endpoint. Pas de clé API, facture brute, conversation ou export public personnel.
- Mettre à jour fiches CURRENT, confidentialité, méthodologie/versionnement, sécurité et contrat de données sans duplication documentaire.

VALIDATION
Tests mensuels frontière UTC, budget absent/nul/seuil/dépassement, données partielles, répartition cache et reasoning, doublons inter-sources, mois chevauchants, choix de priorité, reimport, suppression et versions. Tests API et SQL exécutés owner A/B, fuite impossible par /api/environmental-impact, environmental_impact_snapshots, tableaux admin Codex, rapport public et consommateurs Mobile. E2E navigateur connecté, mesures de couverture Web, typecheck/lint et contrôle documentaire ; distinguer preuve exécutée, CI et application distante.

STOP CONDITION
Un compte voit un historique personnel cohérent, peut régler un budget et corriger ses imports, sait distinguer données connues et estimées et peut comparer des révisions scientifiques sans aucune fuite, double comptage ou contamination des données du projet.
```