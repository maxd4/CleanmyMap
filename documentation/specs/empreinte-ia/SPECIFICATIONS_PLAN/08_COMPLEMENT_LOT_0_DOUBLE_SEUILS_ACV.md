# Complément Codex au lot 0 : objectifs croisés et solveur contraint

**À joindre au lot 0 avant le lot 1.** Remplace intégralement l'ancien `08`. Source candidate `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md`, en particulier §7 et §12. Statut `PLAN` jusqu'à intégration.

```text
COMPLÉMENT LOT 0 : CONTRAINTES DES OBJECTIFS IA

OBJECTIF
Étendre le moteur scientifique existant pour proposer les quantités de mégots et kg de déchets calculées depuis les tokens, avec une plage de curseur réellement admissible pour deux critères distincts. Aucun second moteur ni modification des KPI collectifs d'Actions.

1. FACTEURS ET INDICATEURS
- Dans apps/web/src/lib/environmental-impact-estimator/, conserver le scénario IA versionné et les émissions/eau avec leurs périmètres. Réutiliser scientific-registry et IMPACT_PROXY_CONFIG sans les confondre.
- Carbone déchets recyclés : M×Σ(q_i×z_i×fC_i), facteurs BNR ADEME 2021 admissibles : plastique moyen 2,702 ; aluminium 6,407 ; verre 1,948 kgCO₂e/kg de MPR incorporée ; acier/autres = NA sans source. Rendements z_i et composition q_i explicites, pas de recyclage présumé. La valeur verre correspond à 1 948 kgCO₂e par tonne de MPR verre incorporée (ADEME BNR 2021, https://economie-circulaire.ademe.fr/bnr/verre) et non à chaque kg simplement ramassé. Le proxy terrain 1,2 kgCO₂e/kg ne se cumule jamais avec l'ACV.
- Recyclage mégots facultatif : scénario fournisseur SMET 71 / TchaoMegot, 63/18 000=0,0035 kg CO₂ déclaré/mégot ; uniquement sous filière sélectionnée et hypothèse de comparabilité CO₂/CO₂e signalée. Cocher une case n'est pas une preuve de traitement. Aucun facteur incendie/épuration inventé.
- Eau : distinguer strictement économie nette d'eau consommée par ACV (signée, facteurs homogènes, NA par défaut) du proxy 500 L/mégot de risque de pollution. Ne jamais les additionner. Le recyclage plastique peut avoir un bilan eau défavorable.

2. SOLVEUR DE FAISABILITÉ
- Avec p∈[0,1], rD=9,9 kg/personne-heure, rM=380 mégots/personne-heure : M=H*rD*(1-p), N=ceil(H*rM*p). La part p est un ratio d'effort théorique, pas un ratio de neutralité.
- Objectifs C_IA [kgCO₂e] et W_IA [L] sont calculés depuis les tokens et un scénario explicite ; si inconnu, conserver NA ou requérir un scénario affiché, sans inventer la région du fournisseur.
- Calculer kC(p)=rD*(1-p)*FCmix+rM*p*fCmegot, selon factors admissibles. Le mécanisme de recyclage mégots décoché contribue 0 à ce mécanisme, sans prétendre que le ramassage total n'émet ou n'évite rien.
- Choisir explicitement UNE voie hydrique immuable pour un objectif : RISQUE_CONVENTIONNEL (kH=500*rM*p), ou EAU_CONSOMMEE_ACV (kH=rD*(1-p)*FWmix+rM*p*fWmegot, facteurs nets et comparables nécessaires). Afficher l'autre voie séparément ; jamais de somme ni de changement automatique de voie à un bord.
- Pour chaque pas 0..100 du slider : si C>0 et kC<=0 ou W>0 et kH<=0 => INFEASIBLE ; si source/facteur requis NA => UNKNOWN ; sinon Hmin=max(C/kC,W/kH), avec cibles 0 connues neutralisées. Si Hmax volontaire est défini, Hmin>Hmax => OVER_BUDGET ; sinon FEASIBLE_SCENARIO. Aucun plafond d'effort caché. L'ensemble admissible peut ne pas être contigu.
- Un bord 0/100 impossible doit être désactivé et expliqué. Ne jamais forcer un 0 % eau mégots à réussir sans mégots ou un 100 % carbone mégots sans facteur applicable. Si aucun pas admissible : signaler NO_FEASIBLE_POSITION, ne pas inventer des kg/mégots compensatoires.
- Recalculer les deux contributions après arrondi de N au supérieur ; les objectifs restent des analogies conditionnelles, jamais une compensation physique. Fournir une projection pure réutilisable et statuts avec provenance/factorsVersion.

3. VALIDATION
- Vérifier la non-régression des exemples §9.5 du fichier 01 après correction du verre : F_C_mix=2,7709 kgCO₂e/kg à z_i=1 ; référence 1 M tokens US, p=0, objectif carbone seul : environ 43,58 g ; p=50 % avec scénario fournisseur mégots : kC≈14,380955 kgCO₂e/h, H_C≈0,008397 h et environ 41,6 g de déchets + 2 mégots. Vérifier la simulation 15 milliards de tokens avec z_i=0,7 et p=20/80 % en recyclage mégots activé/désactivé, sans traiter les bénéfices conventionnels comme une compensation.
- Test de référence : scénario 1 M tokens US, C=0,12075 kgCO₂e, W indirecte=1,5594 L, mix 50 % plastique/10 % aluminium/40 % verre et z=1, mégots sans recyclage, voie RISQUE_CONVENTIONNEL, Hmax=0,25 h : positions 1..98 % (pas 1 %), 0 et 100 % impossibles, 99 % au-dessus du budget.
- Tests calculatoires : p=0,1 et 0,5 ; mégots recyclage sélectionné/non sélectionné ; facteur manquant/0/négatif ; waterMode ACV/risque ; matériaux inconnus et fractions ; cibles nulles ou NA ; budget Hmax atteint/dépassé ; effort divergent près d'une borne ; étapes discontinues ; arrondis et monotonie des besoins.
- Préserver contrats de calcul IA, KPI terrain, absence de double PUE/eau, historiques ; exécuter tests du domaine, consommateurs et la couverture ciblée, puis mettre à jour les docs CURRENT concernées.


4. DESTINATIONS ET SENSIBILITÉS DÉTERMINISTES (COMPLÉMENT DU MÊME LOT)
- S'appuyer sur `01` §16 et `19` pour coder dans la même projection pure les `recyclingDestinationScenario` par catégorie, la fraction orientée à recyclage r_i, l'efficacité de réincorporation z_i et y_i=r_i*z_i. Exposer séparément masse collectée, recyclée présumée, effectivement incorporée et destination alternative. Ne pas toucher au contrat des quantités physiques terrain ni créer un second calculateur.
- 0 ≤ r_i,z_i ≤ 1 ; si inconnus, valeur effective `NA`. En simulation, y=0,3/0,7/1 sont **scénarios volontaires** affichés ; jamais des « taux moyens français » inférés. Un scénario d'incinération, avec ou sans récupération énergétique, n'a aucun facteur `fC_BNR` : gain **recyclage** 0 pour la fraction non réincorporée, émissions du traitement/net climatique `NA` jusqu'à ACV locale spécifique ; ne pas afficher « émissions nulles ». Un matériau sans facteur, une destination inconnue ou une couverture partielle ne doit pas être masqué dans un total intégral de bénéfice réel.
- Conserver les choix du curseur fondés sur `kC` et sur **UNE voie** hydrique constante. `RISQUE_CONVENTIONNEL` reste une analogie, non une économie d'eau consommée. Le traitement incinération ne garantit aucune économie d'eau. Fournir provenance/version de chaque branche, tests et messages des extrêmes impossibles.
- Cas OpenAI 15 milliards de tokens : trois scénarios non calibrés a=0,06/0,30/0,60 kWh IT/M, PUE 1,15, régimes FR 0,0200 et US 0,35 kgCO₂e/kWh **en illustrations géographiques uniquement** ; pas de facteur fournisseur réel. Le facteur dix est un quotient des **scénarios énergétiques**, non une distribution de probabilité ; ne pas le présenter en précision à 95 %. OpenAI 0,34 Wh / requête ChatGPT ne convertit pas 15 milliards de tokens Codex en énergie.
- Ajouter les fixtures et assertions exactes de `19` : p=0,20 y=0,70 : H_sans=117,90557 h et H_avec=115,89871 h, gain ~1,702 % ; p=0,80 y=0,70 : H_sans=471,62228 h et H_avec=369,30616 h, gain ~21,695 %. Inclure M et N exacts après ceil, couverture des deux seuils, et p=1 carbone sans facteur mégots `INFEASIBLE`. À y=0,30 et p=0,80 le gain est ~39,26 % ; à y=1 ~16,24 %. Aucune règle « recyclage = -20 % » codée en dur.
- Préserver tests des facteurs recyclage verre **1,948**, plastique 2,702 et aluminium 6,407 kgCO₂e/kg de MPR incorporée. Pour chaque `INCINERATION_*`, tester `B_recyclage=0` sur la fraction incinérée MAIS `emissionsTreatment=NA`, `netClimateBenefit=NA`. Le moteur doit distinguer `0` (connu) de `NA` (inconnu) ; documenter intégralement provenance et frontières.

STOP CONDITION
Pour tout scénario admissible, le noyau retourne les quantités calculées et les positions autorisées, ou une raison explicite d'impossibilité/indétermination ; aucune fausse neutralisation et aucun facteur arbitraire.
```