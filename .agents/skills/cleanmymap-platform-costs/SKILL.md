---
name: cleanmymap-platform-costs
description: "Analyser et réduire les coûts et quotas Vercel, Supabase et services externes CleanMyMap sans sacrifier la sécurité."
category: repository
risk: medium
source: local
tags: "[platform, costs]"
---

# Coûts, quotas et services externes

## Déclenchement

Activer pour consommation Vercel/Supabase, API externes, caches, polling, facturation, quotas gratuits, jobs, médias, stockage ou incident de capacité.

## Sources

`documentation/operations/platform-cost-governance.md`, `documentation/operations/services-stack.md`, `documentation/database/supabase-table-optimization-playbook.md`, `documentation/operations/runbook-monitoring-logs.md`, code appelant et métriques fournisseur réellement accessibles.

## Méthode

1. Identifier l'opération distante exacte, son rôle produit et son déclencheur, pas seulement la page.
2. Classer `A essentielle`, `B facultative` ou `C récurrente` selon le contrat actuel, indépendamment des rôles AuthZ.
3. Pour B, empêcher réellement fetch/RPC/SSR/prefetch avant intention ; pour C, limiter cadence, inactivité, concurrence et redondance, sans perdre une alerte importante.
4. Vérifier cache/fraîcheur/permissions/invalidation. Un cache partagé ne doit pas révéler la réponse privée d'un autre utilisateur.
5. Quantifier les requêtes, octets, temps, coût ou quotas **observés**. Ne pas transformer un audit statique en mesure de facturation et ne pas inventer un prix du fournisseur.
6. Comparer solutions simples : projection courte, statique/ISR, pagination, index SQL, lazy load réel, déduplication, mécanisme existant. Pas de nouvelle infrastructure sans bénéfice démontré.

## Validation

Évaluer chemin froid, chaud, non ouvert, erreur, quota atteint et changement d'identité ; mesurer avant/après à périmètre comparable. Ne jamais sacrifier sécurité, données ou obligations légales pour réduire la consommation.
