# Protocole de Fiabilisation des Indicateurs

Ce protocole définit les mécanismes de contrôle pour garantir la véracité des métriques d'impact affichées sur la plateforme CleanMyMap.

## 1. Sources de Vérité
- **Impact Terrain** : Formulaires de bilan de ramassage validés par les associations partenaires.
- **Coût Numérique** : Logs API (Tokens IA), temps de build CI/CD, et volume de stockage Supabase.

## 2. Contrôles de Cohérence
- **Seuils d'Alerte** : Un signalement de "10 tonnes" pour un individu seul déclenche une alerte automatique `dataIntegrityPriority`.
- **Réconciliation Mensuelle** : Comparaison entre les données déclaratives (formulaires) et les preuves visuelles (photos stockées).

## 3. Revue des Métriques
Une revue mensuelle est menée par l'équipe technique pour :
1. Valider les coefficients de conversion (ex: kg de CO2 par Go stocké).
2. Identifier les anomalies dans le funnel d'engagement.
3. Mettre à jour le dashboard public.

## 4. Tracabilité
Toutes les métriques consolidées doivent être exportables au format CSV/JSON pour permettre un audit externe indépendant.
