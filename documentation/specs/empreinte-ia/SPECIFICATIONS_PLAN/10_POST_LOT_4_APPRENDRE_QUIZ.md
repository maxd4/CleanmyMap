# Prompt Codex après le lot 4 : contenus Apprendre et quiz

**Exécution : après revue du lot 11 puis du nouveau lot 12.** Type : macro-lot pédagogique. Sources candidates : `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md` (notamment §14) et `13_SOURCES_ENTRAINEMENT_ET_EXEMPLES.md`. Les chiffres d’entraînement restent des preuves facultatives attachées aux modèles dans le moteur, le quiz ne calcule aucun résultat personnel. Les vérités techniques restent dans le moteur scientifique, le quiz ne calcule pas d'empreinte utilisateur.

```text
MACRO-LOT : Réutiliser les connaissances « Mon empreinte IA » dans Apprendre et les quiz

OBJECTIF
Relier la pédagogie de /learn/empreinte-ia, y compris les nouveaux volets entraînement et impacts non compensables du lot 12, aux rubriques et au quiz existants, sans ajouter de moteur de quiz, de schéma ou de source de vérité scientifique concurrente.

1. CONTENU ET NAVIGATION
- Enrichir les surfaces appropriées déjà existantes, en priorité /learn/comprendre, /sections/recycling et /learn/sentrainer, avec des cartes et liens vers les explications scientifiques du calculateur. Ne pas dupliquer un long cours ou ajouter de page autonome sans nécessité.
- Vulgariser avec sources : tokens -> électricité/PUE -> mix électrique/CO₂e -> eau directe/indirecte ; 500 L/mégot comme volume de pollution potentiel, différent de l'eau consommée ; aluminium issu de la bauxite ; plastique vierge issu de ressources fossiles et recyclage susceptible de consommer de l'eau ; verre recyclé (calcin) qui remplace une partie du sable siliceux, des carbonates et de l'énergie de fusion ; filière réelle et pertes de tri.
- Souligner le résultat contre-intuitif ADEME BNR 2021 : bilan net carbone favorable des plastiques recyclés incorporés, mais bilan défavorable pour l'utilisation de ressources en eau dans le scénario étudié. Ne pas promettre la même conclusion pour tous les procédés.
- Ajouter des passerelles vers /learn/empreinte-ia#modeles et /learn/empreinte-ia#impacts-limites en reprenant les contenus validés au lot 12 : distinction entraînement/inférence ; part énergie de l'entraînement comparée à l'énergie utilisateur, jamais aux seuls tokens ; dilution comptable sur U utilisateurs ; jours de cumul selon une hypothèse de trafic ; phase supplémentaire et amortissement ; annonces carbone location-based/market-based ; travail d'annotation, bruit, tensions eau et limites de compensation. Aucun prix environnemental attribué aux personnes ni équivalence sociale en mégots.

2. QUESTIONS DANS LE QUIZ EXISTANT
- Réutiliser apps/web/data/environmental-quiz-bank/impact-methodologie.ts ou tri-recyclage.ts selon catégorie ; conserver l'assemblage et l'ordre canonique apps/web/data/environmental-quiz-bank.ts, schémas, taxonomie, sources, cibles de révision et protections de doublons.
- Ajouter 11 à 14 questions nouvelles au total, avec distracteurs plausibles, explications, sourceUrl primaire, sourceLabel, lastCheckedAt et métadonnées réellement attendues par le contrat : 7 à 9 sur les mécanismes collecte/recyclage ci-dessous, puis 4 à 5 sur entraînement/inférence et limites non compensables. Couvrir au moins : (a) 500 L/mégot n'est pas une économie d'eau consommée, (b) une ACV CO₂ favorable peut avoir une empreinte eau défavorable, exemple plastiques ADEME, (c) kg de déchet collecté ≠ kg de matière recyclée incorporée, (d) mélange aluminium/verre/plastique sans facteurs distincts = comparaison carbone incertaine, (e) région du serveur inconnue ≠ région du compte, (f) verre recyclé économise des ressources et énergie mais ne « fabrique » pas de sable, (g) comment le recyclage effectif des mégots peut ouvrir un scénario carbone à 100 % mégots, (h) pourquoi le simple ramassage ne génère pas de crédits CO₂ incendie/traitement, (i) pourquoi des litres d'eau consommée et un volume de pollution potentielle de 500 L/mégot ne s'additionnent pas.
- Compléter par quatre ou cinq raisonnements nouveaux : (j) pourquoi une ratio « énergie d'entraînement / énergie d'utilisation » n'est pas « tokens d'entraînement / tokens utilisateur » ; (k) pourquoi la division par U utilisateurs ne réduit pas la pollution historique ; (l) ce que change une quantification ou distillation, et pourquoi « plus petit » ne prouve pas une moindre empreinte complète ; (m) quand N_amortissement est indéterminable ; (n) pourquoi la collecte de déchets ne compense pas une condition de travail d'annotation ou une nuisance acoustique. Préférer des scénarios à des chiffres à mémoriser.
- Les questions vérifient le raisonnement et les distinctions physiques, pas la mémorisation de chiffres instables. Aucun résultat personnel ni donnée Clerk dans le quiz.

3. CONTRÔLES
- Tests du catalogue et des métadonnées, unicité des IDs, ordre canonique, réponses correctes, aucune référence cassée, rendu et navigation effectifs vers les pages Apprendre, absence de changement aux scores/SRS/règles de sélection. Suivre documentation/features/quiz/quiz-authoring-guide.md et les AGENTS scoped.
- Mettre à jour les fiches CURRENT des pages effectivement enrichies et la documentation de quiz pertinente, sans nouvelle copie du protocole scientifique.

STOP CONDITION
Les utilisateurs retrouvent les explications de l'empreinte IA, de l'entraînement et des limites non compensables dans Apprendre et répondent à des questions scientifiquement exactes dans le quiz EXISTANT, sans logique d'impact dupliquée ni changement de progression.
```


## Complément scientifique 2026.11 : recyclage, incinération et données fournisseur

À intégrer **dans la même exécution du complément 10**, sans changer le nombre de questions ciblé par le lot initial : substituer certains items de qualité inférieure aux propositions suivantes plutôt que dépasser artificiellement le volume. Sources de référence : `01` §16, `19` et `20`.

- Différence entre un jeton, une requête et des watt-heures : les 0,34 Wh publiés pour une requête ChatGPT moyenne en 2025 ne définissent pas un facteur Codex kWh/million de tokens. Les trois valeurs 0,06/0,30/0,60 ne sont pas un intervalle statistique, mais des hypothèses représentant un facteur dix.
- Un datacenter alimenté par un réseau largement nucléaire/renouvelable peut avoir une intensité carbone opérationnelle basse, sans devenir neutre en énergie, en eau, en matériaux ou en ACV ; une annonce d'achat d'électricité décarbonée n'identifie pas le réseau du token traité.
- Distinguer kg **ramassés**, kg envoyés au tri, kg acceptés pour recyclage et kg **réincorporés** ; les facteurs BNR s'appliquent au dernier flux dans son périmètre ACV. Pour le verre, `1 948 kgCO₂e/t = 1,948 kgCO₂e/kg` de MPR incorporée, jamais `0,948`.
- Incinération sans récupération de chaleur = élimination ; avec récupération d'énergie = valorisation énergétique possible. **Dans les deux cas, aucune MPR incorporée pour cette fraction**, et le bilan climatique de l'incinération n'est ni nul ni automatiquement favorable. Un déchet ramassé puis incinéré peut néanmoins réduire sa dispersion locale.
- Les bénéfices humains (minutes d'action, présence confirmée, sensibilisation) ne se convertissent pas en émissions évitées ; risques hydriques, microplastiques et biodiversité demandent d'autres unités et niveaux de preuve.
- Comparaison numérique : p=80 % de mégots avec scénario fournisseur et y=70 % donne environ 21,7 % de réduction **d'effort théorique**, p=20 % seulement 1,7 %. Ne pas faire mémoriser ces nombres ; demander pourquoi le pourcentage dépend de p et des rendements.

Mettre des `sourceUrl` primaires, des explications sans équivalence trompeuse et des réponses qui n'encouragent pas la manipulation de déchets dangereux. Conserver les objectifs, métadonnées et contrôles de tests du lot 10 d'origine.