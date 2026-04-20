# Visual-first priorites

Top 10 des zones ou le visuel remplace le plus de texte et reduit le temps de comprehension.

## Classement priorise
1. **Onboarding dev**  
   Cible: `documentation/index-par-objectif.md`  
   Impact: demarrage contributeur en < 5 min (ou agir, quoi valider, ou risquer regression).
2. **System overview architecture**  
   Cible: `documentation/architecture/system-overview.md`  
   Impact: lecture immediate du flux front/API/data sans prose longue.
3. **Modules et dependances**  
   Cible: `documentation/architecture/modules-cles-et-dependances.md`  
   Impact: localisation rapide des zones code par type de demande.
4. **Front/back boundaries**  
   Cible: `documentation/architecture/frontend-backend-boundaries.md`  
   Impact: reduction des erreurs de placement (UI vs API vs lib domaine).
5. **Pipeline import data**  
   Cible: `documentation/data/pipeline-import.md`  
   Impact: reduction des erreurs d'import via sequence visuelle des etapes.
6. **Schema normalisation data**  
   Cible: `documentation/data/schema-normalisation.md`  
   Impact: meilleur alignement sur les contrats de donnees.
7. **API vigilance securite**  
   Cible: `documentation/securite/api-vigilance.md`  
   Impact: controle rapide des checks obligatoires avant merge/deploy.
8. **AuthN/AuthZ regles**  
   Cible: `documentation/securite/authz-authn-regles.md`  
   Impact: evite regressions d'acces sur routes sensibles.
9. **Runbook incidents**  
   Cible: `documentation/exploitation/incidents-frequents-et-reprise.md`  
   Impact: baisse du MTTR avec arbre de decision incident.
10. **Runbook monitoring/deploiement**  
   Cibles: `documentation/exploitation/runbook-monitoring-logs.md`, `documentation/exploitation/runbook-deploiement.md`  
   Impact: execution operationnelle standardisee (avant/pendant/apres deploy).

## Couverture demandee
- Onboarding: priorites 1, 4.
- Architecture: priorites 2, 3.
- Data: priorites 5, 6.
- Securite: priorites 7, 8.
- Runbooks: priorites 9, 10.
