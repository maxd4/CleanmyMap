# Prompt Codex : Lot 0/3, socle scientifique et comparaison cleanwalk

**Type : LOT XL / complément prioritaire.** À exécuter avant les trois lots fonctionnels. Ce document est un prompt autonome, prêt à copier dans Codex. Le détail des choix et calculs figure dans `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md` si ce fichier est joint au chantier.

```text
LOT 0/3 : Fiabilité du calculateur IA et comparaison pédagogique cleanwalk.

OBJECTIF
Fiabiliser le noyau personal-ai-estimator et offrir dans /methodologie une comparaison IA/cleanwalk scientifiquement honnête, avant les parcours utilisateurs des lots suivants. Étendre l'owner apps/web/src/lib/environmental-impact-estimator/ ; réutiliser model-catalog, ecologits-adapter, scientific-registry, IMPACT_PROXY_CONFIG et les composants/design system existants. Aucun second moteur ni mutation des KPI terrain.

JALON 1 : COMPTABILITÉ PHYSIQUE
- Admettre explicitement les frontières mesurées energy_it, energy_facility et energy_local_wall. E_facility=E_IT×PUE seulement pour E_IT ; ne jamais réappliquer PUE sur l'énergie totale. Pour un appareil local : E=P_mean(W)×t(s)/3 600 000 ; si P_load et P_idle sont documentées, produire séparément E_incremental=max(0,P_load-P_idle)×t/3 600 000. PUE=1 local.
- EcoLogits v3.0.0 reste la méthode de référence quand architecture active/totale, tokens générés et granularité par requête sont présents. Interdire l'usage d'un bucket fournisseur comme une requête fictive et préserver l'absence de modèle/latence. Agréger les résultats par requête ; sinon afficher une sensibilité PROXY, sans revendiquer la parité EcoLogits sur l'agrégat.
- Conserver séparément scénario générique EXISTANT 0,06/0,30/0,60 kWh par million de tokens textuels, strictement ASSUMPTION+PROXY, jamais mesure ni facteur universel. Aucun coefficient électrique automatique si région d'inférence inconnue.

JALON 2 : CARBONE, EAU, ACV
- Ajouter au registre versionné le facteur RTE France 2025 consommation 0,0200 kgCO2e/kWh (source RTE Bilan électrique 2025). Préserver 2024 et les calculs historiques. Scope explicite, aucune assimilation producteur/consommateur, location-based/market-based ou direct/ACV.
- Appliquer CO2e_op=E_facility×CI_location ; si région inconnue retourner null et proposer seulement des comparaisons explicites France 2025 (0,0200), Europe élargie RTE (0,178, périmètre production) et proxy US du dépôt (0,35), jamais un intervalle probabiliste mondial.
- Eau directe=E_IT×WUE_site ; indirecte=E_facility×WUE_grid. Réserver 4,52 L/kWh au scénario US ; si un terme manque, total eau=null. Utiliser l'incorporé EcoLogits seulement si applicable ; sinon null. Garder +30 % du bilan historique comme sensibilité à part, pas comme ACV physique ni ajout double.

JALON 3 : ÉQUIVALENCE CLEANWALK ET UI
- Ajouter une fonction pure et versionnée de comparaison à une cleanwalk conventionnelle de 5 kg de déchets, associée dans l'UI à cinq volontaires et une heure uniquement comme représentation, PAS comme rendement observé. C_cw=5×IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg ; R_cw=CO2e_IA_op/C_cw quand les deux existent et C_cw>0. Exposer effectiveVersion et statut PROXY des deux côtés.
- Afficher dans la partie IA de /methodologie une carte pédagogique interactive avec échantillon contrôlé 1 million de tokens, scénarios bas/central/haut, explications formule/source, énergie/CO2/eau et R_cw ou NA. Ajouter en permanence « La collecte de déchets ne compense pas les émissions de l'IA. Comparaison de proxys uniquement. » Ne jamais attribuer XP, crédits carbone ou émissions évitées certifiées.
- Réutiliser PageHeader, CmmCard/CmmButton si adaptés, palette d'impact, navigation et modes exhaustif/minimaliste/sobre ; responsive, clavier et réductions de mouvement.

VALIDATION
Tests unitaires des frontières de mesure et du double PUE, inconnues/zéros, granularité EcoLogits, facteurs et dates/version, WUE partiel, +30% séparé, ratio 5×1,2=6 kg, facteur terrain nul, résultats du scénario 1M tokens : E_facility 0,069/0,345/0,690 kWh ; CO2 FR 1,38/6,90/13,80 g ; ratios 0,000230/0,001150/0,002300. Vérifier aucun changement des KPI terrain, rendu /methodologie au navigateur, accessibilité, tests ciblés/coverage, typecheck/lint et documentation CURRENT SCIENTIFIC_PROTOCOL + fiche page.

STOP CONDITION
Les calculs sont mathématiquement reproductibles et scientifiquement qualifiés ; /methodologie propose une vraie comparaison testée, sans supposer un datacenter, sans fabriquer de mesure et sans revendiquer une compensation.
```