# Master Pack — référence courante

Cette fiche décrit uniquement les points vérifiés dans l’implémentation
actuelle. Le code et ses tests restent les sources de vérité pour les règles,
formules, KPI et données générées.

## Sources canoniques

- Implémentation du Master Pack :
  `apps/web/src/lib/reports/master-pack/`
- Modèle de rapport canonique :
  `apps/web/src/lib/reports/report-model/`
- Chapitres et intitulés courants :
  `apps/web/src/lib/reports/master-pack/constants.ts`

Les chapitres actuellement déclarés dans `MASTER_PACK_CHAPTERS` sont :

- `sommaire` — Table des Matières ;
- `executif` — Synthèse Institutionnelle ;
- `pilotage` — Focus Décideurs ;
- `terrain` — Focus Opérationnel ;
- `contexte` — Analyse d'Impact Environnemental ;
- `communaute` — Engagement Citoyen ;
- `gouvernance` — Méthodologie & Transparence ;
- `annexes` — Annexes & Exploitation.

Les formules et KPI doivent être lus dans les modules canoniques du Master
Pack et du Report Model. Ils ne sont pas recopiés dans cette fiche afin d’éviter
une divergence documentaire.

Pour le contexte conceptuel et historique, consulter le
[document historique](../sessions/history/master-pack-concept-historical.md).
