# Gouvernance et Sobriété Numérique - CleanMyMap

Ce document définit les règles de gouvernance pour le développement de CleanMyMap, avec un focus particulier sur l'usage de l'IA et la réduction de l'empreinte environnementale.

## 1. Principes Fondamentaux

- **Sobriété par Design** : Chaque nouvelle fonctionnalité doit être évaluée sous l'angle de son utilité réelle vs son coût environnemental (stockage, calcul, transfert de données).
- **IA Assistée, pas Autonome** : L'IA est un outil d'assistance. Toute production d'IA doit être validée, testée et comprise par un humain avant d'être intégrée.
- **Transparence** : Les décisions techniques majeures doivent être documentées dans des ADR (Architecture Decision Records) incluant un volet impact environnemental.

## 2. Usage de l'IA (LLM)

### Règles d'Or

1. **Validation Systématique** : Ne jamais copier-coller du code généré sans le relire ligne par ligne.
2. **Refactoring Sobre** : Utiliser l'IA pour simplifier le code existant et supprimer les redondances, plutôt que pour générer des couches d'abstraction inutiles.
3. **Optimisation des Prompts** : Préférer des prompts précis et contextuels pour minimiser les itérations et la consommation de tokens (et donc d'énergie).

### Checklist de Validation IA (obligatoire pour chaque PR)

- [ ] Le code généré respecte les standards de typage du projet.
- [ ] Aucune dépendance inutile n'a été ajoutée par l'IA.
- [ ] La logique métier a été vérifiée manuellement.
- [ ] Des tests unitaires couvrent les nouveaux comportements.

## 3. Sobriété Technique

### Gestion des Assets

- **Images** : Format WebP ou AVIF obligatoire pour le Web. Compression maximale sans perte de qualité visible.
- **Vidéo** : Utiliser des services de streaming optimisés ou des formats très compressés. Auto-play désactivé par défaut.

### Infrastructure & CI/CD

- **Filtres de Chemins** : Utiliser `paths-ignore` dans GitHub Actions pour éviter de lancer des builds inutiles (ex: modifs de documentation).
- **Rétention des Données** : Appliquer des politiques de TTL (Time To Live) sur les données non critiques (photos de signalements résolus, logs anciens).

## 4. Processus de Revue

Toute Pull Request doit inclure une section "Impact Numérique" résumant :

1. Les changements dans le poids des assets.
2. L'impact sur les performances (Core Web Vitals).
3. L'usage fait de l'IA lors du développement.

---
*Ce document est vivant et doit être mis à jour au fil des sessions d'audit.*
