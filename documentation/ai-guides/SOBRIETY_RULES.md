# Charte de Développement Sobre et IA (CleanMyMap)

Ce document définit les règles strictes à suivre pour tout futur développement assisté par IA, afin de garantir le respect de l'Audit d'Impact IA et le maintien d'un IUR (Indice d'Utilité Réelle) élevé.

## 1. Règle d'Or : Le Filtre IUR
Avant toute nouvelle fonctionnalité ou refactorisation majeure assistée par IA, se poser la question :
> **"Est-ce que cet ajout améliore l'impact terrain (nettoyage, signalement) plus qu'il n'augmente le coût numérique (poids JS, appels API, stockage) ?"**

- **OUI** : Le développement est autorisé.
- **NON** : La fonctionnalité doit être abandonnée ou simplifiée (heuristique plutôt qu'IA).

## 2. Développement Assisté par IA (Coding)
- **Logique de Moindre Code** : Ne jamais accepter une solution générée par l'IA qui ajoute des dépendances externes (`npm install`) sans justification vitale. Préférer le Vanilla JS ou les utilitaires existants (`lib/utils`).
- **Audit de Bloat** : Après chaque session de code assistée par IA, vérifier que le nombre de lignes n'a pas explosé inutilement. Supprimer systématiquement les commentaires de débogage ou les fonctions "au cas où".
- **Documentation Sémantique** : Maintenir la règle des **Semantic Line Breaks** (une phrase par ligne) dans toute la documentation technique pour faciliter les audits futurs.

## 3. Usage de l'IA dans le Produit (Features)
- **Modèles Small-First** : Toujours tester si un modèle léger (ex: Gemini Flash, GPT-4o-mini) suffit avant d'utiliser un modèle lourd.
- **Human-in-the-loop** : Aucune décision d'IA impactant le terrain (validation de signalement) ne doit être finale sans une possibilité de veto par un utilisateur ou un administrateur.
- **Cache et Sobriété** : Les résultats d'inférence IA doivent être mis en cache autant que possible pour éviter les appels redondants au serveur (coût énergétique et financier).

## 4. Gouvernance et Maintenance
- **Rôle de Responsable Sobriété** : Un développeur doit être désigné pour chaque lot comme garant de la sobriété. Il a le droit de veto sur le code jugé trop lourd.
- **Mise à jour des Stats** : Après chaque merge important, lancer le script `node scripts/update-audit-stats.mjs` pour maintenir la transparence de l'audit.
- **Mitigation du Lock-in** : Tout nouveau service tiers (API d'IA, Auth, Base de données) doit être isolé derrière un adaptateur pour permettre une migration facile si le fournisseur devient insoutenable.

## 5. Checklist de Validation (Definition of Done)
- [ ] Le code respecte les standards de performance existants.
- [ ] Aucune variable d'environnement sensible n'est exposée.
- [ ] L'IUR est préservé ou amélioré.
- [ ] Les tests de non-régression sur les parcours critiques sont verts.

---
*Cette charte est évolutive et doit être consultée par tout contributeur au projet.*
