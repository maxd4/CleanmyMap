# Prompt Codex : Lot 3/3, suivi et budgets personnels

> **Statut documentaire : PLAN.** **Type : LOT XL / réécriture de l'ancien prompt « Suivi personnel ».** Le lot dépend des lots 0, 1 et 2 et reste à réaliser; les comparaisons terrain demeurent pédagogiques, sans dette carbone personnelle ni obligation de nettoyage. Les équivalences terrain abandonnées ne font pas partie de ce lot. Les arbitrages budgétaires, de non-compensation et d’activité sans tokens sont centralisés dans [24](./24_ARBITRAGES_PREUVES_ET_PRIORITES.md) et l’errata applicable dans [ERRATA_CONTRATS_0_08.md](./ERRATA_CONTRATS_0_08.md).

```text
LOT 3/3 : Historique personnel, budget de tokens et recalculs scientifiques explicites.

OBJECTIF
Compléter « Mon empreinte IA » avec un tableau de bord privé fiable à partir des déclarations, imports et scénarios rapides existants. Un seul owner métier, aucun nouveau quota fournisseur, aucune modification des snapshots publics ou de l'administration des services CleanMyMap. La page et les parcours source sont déjà publiés; le présent lot reste limité aux fonctions de budget et d’historique non livrées.

JALON 1 : HISTORIQUE ET AGRÉGATS
- Historique privé consultable, trié et filtré par période, fournisseur, modèle, éditeur, opérateur, cloud/local, origine (manuel/import/scénario rapide), modalité et statut actif/exclu/partiel. Détails de provenance et version de normalisation/méthode visibles.
- Totaux par mois UTC [début,fin[ : tokens entrants comprenant cache une seule fois, sorties et raisonnement selon sa relation d'inclusion, nombre de requêtes, coûts par devise sans conversion forcée, énergie et CO2e avec périmètre/provenance. Ne pas agréger les scopes doublons, buckets imbriqués, relevés incomplets ou périodes traversant deux mois sans ventilation sourcée ; montrer la couverture et les exclus.
- Une estimation rapide issue d'échanges déclarés n'est pas un relevé de tokens observés : afficher l'activité distinctement, ne pas la sommer aux tokens fournisseur, et détecter tout recouvrement avec un historique importé. Les sous-totaux d'énergie hypothétiques et les mesures physiques ne sont pas mélangés sans règle de comparabilité.
- Tableau « Conflits » avec choix explicite de la source prioritaire (conserver le détail et exclure l'agrégat, ou inversement), correction, exclusion, restauration, suppression et réimport idempotent. Réconciliation persistante, pas de doublons de méthode ou de valeur historique.

JALON 2 : BUDGET ET VERSIONS
- Budget personnel mensuel facultatif en tokens, configuré par owner, avec avertissement paramétrable (défaut de présentation proposé 80 % uniquement si l'utilisateur active le budget), pourcentage et dépassement ; ce n'est PAS un quota fournisseur et ne bloque jamais les API tiers.
- Budget tokens_logiques = inputTotal + outputTotal après normalisation fournisseur et déduplication, uniquement si les deux composantes sont connues. Si couverture incomplète, afficher « consommation connue minimale / total non déterminable », pas une progression présentée comme exhaustive. Mois UTC, coûts séparés et pas de conversion financière en kWh.
- Budget monétaire optionnel séparé, par devise et période ; facture et tokens ne sont pas convertibles. Aucun montant d'abonnement, gratuit ou payant, ne détermine un nombre de tokens ou un nombre de kWh. Une estimation énergétique non calibrée n'est pas un quota environnemental mesuré ; tout seuil est un scénario distinct.
- Recalcul volontaire et versionné avec les facteurs scientifiques courants : créer une nouvelle révision de résultat rattachée à la source personnelle sans écraser la précédente ; conserver version, facteurs, hypothèses et moment du recalcul, afficher ancien/nouveau et delta. Ne recalculer ni PDF historique, ni chiffres projets, ni lignes de tiers.

JALON 3 : UI, CONFIDENTIALITÉ ET DOCUMENTATION
- Composer une seule page avec Synthèse, Activité dans le temps, Répartition, Comparaison pédagogique d'impacts et de mécanismes terrain, Budget, Historique et Conflits. Graphiques accessibles, tableaux à unités, libellés « mesuré », « déclaré », « scénario » et « NA », indicateurs de couverture et source d'incertitude, boutons Modifier/Exclure/Supprimer/Recalculer.
- Réutiliser le solveur scientifique de double objectif du lot 0 + 08 pour une analogie conditionnelle selon le protocole CURRENT et l’errata. Ne pas assimiler litres de risque mégots à eau consommée ni un mécanisme de collecte à une économie nette de carbone. Aucune compensation, aucun badge, XP ou crédit carbone.
- Anonyme : calculateur et explication, jamais l'historique privé. Responsive, clavier, mode sobre/minimaliste/exhaustif.
- Stocker uniquement le minimum personnel requis. Appliquer AuthN/AuthZ/RLS sur budgets, estimations et historique, y compris IDOR, caches interutilisateurs et tout nouvel endpoint. Pas de clé API, facture brute, conversation ou export public personnel.
- Mettre à jour fiches CURRENT, confidentialité, méthodologie/versionnement, sécurité et contrat de données sans duplication documentaire.

VALIDATION
Tests mensuels frontière UTC, budget absent/nul/seuil/dépassement, données partielles, scénario rapide sans tokens, répartition cache et reasoning, doublons inter-sources, mois chevauchants, choix de priorité, reimport, suppression et versions. Tests API et SQL exécutés owner A/B, fuite impossible par /api/environmental-impact, environmental_impact_snapshots, tableaux admin Codex, rapport public et consommateurs Mobile. E2E navigateur connecté, mesures de couverture Web, typecheck/lint et contrôle documentaire ; distinguer preuve exécutée, CI et application distante.

STOP CONDITION
Un compte voit un historique personnel cohérent, peut régler des budgets distincts sans convertir coût ou échanges en énergie mesurée, sait distinguer données connues et estimées et peut comparer des révisions scientifiques sans aucune fuite, double comptage, fausse compensation ou contamination des données du projet.
```
