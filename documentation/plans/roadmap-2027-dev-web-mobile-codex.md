# Roadmap 2027 : développement web, mobile et IA avec Codex

> **Statut : `PLAN / EXECUTION 2027` ; document prévisionnel, non attestation d'implémentation.**
>
> **Périmètre :** code, expérience utilisateur, API, données, sécurité, tests, infrastructure et application native `apps/mobile` de CleanMyMap. L'IA désigne ici principalement l'assistance au développement par Codex ; toute fonctionnalité d'IA destinée aux utilisateurs demeure conditionnelle.
>
> **Horizon :** novembre 2026 à décembre 2027. Dates trimestrielles indicatives, à replanifier selon les preuves terrain et la capacité de développement.
>
> **Autorité :** ce fichier décline dans le temps `documentation/product/roadmap-priorisee.md`. Il **ne crée pas un second ordre canonique** et ne remplace ni le code sur `main`, ni les contrats de domaine, ni le plan déjà existant `documentation/plans/PLAN_MACRO_LOTS_UI_UX_CODEX.md`. Pour les actions sans code, voir [`roadmap-2027-hors-code.md`](./roadmap-2027-hors-code.md).

## 1. Objectif produit et règle de décision

Faire fonctionner de bout en bout la boucle :

```text
besoin observé -> action préparée -> inscription -> intervention terrain
-> résultats réellement documentés -> rapport interprétable
-> acteur qui utilise le rapport -> nouvelle action facilitée
```

En 2027, **la fiabilité d'une action réelle prime sur l'ajout de fonctionnalités**. Réutiliser les composants et contrats existants, puis ne développer un comportement supplémentaire que lorsqu'un défaut, un besoin utilisateur ou une dépendance indispensable est démontré.

### État de référence à revalider à chaque lot

- **Web `CURRENT` :** application Next.js avec cartes, signalements, actions avant/après intervention, coordination, rapports PDF/JSON/CSV, pédagogie, réseau et gamification. Présence dans le code et validation sur le terrain sont deux preuves distinctes.
- **Rapports :** moteur et historique existants ; les deux thèmes PDF `Impact` et `Scientifique` réutilisent la même composition. La qualité et la réutilisation effective auprès d'organisateurs externes restent à confirmer.
- **Mobile :** application Expo/React Native en développement actif, `NOT_PRODUCTION_READY`. Le shell `Agir / Carte / Compte`, les parcours natifs Agir et le socle GPS/offline existent dans les contrats actuels ; les tests physiques, le background et la distribution nécessitent une validation distincte.
- **Données :** Clerk comme identité principale ; Supabase/PostgreSQL et Storage comme persistance ; calculs métier, RLS, limites des proxys et gouvernance préservés.
- **IA fonctionnelle :** aucune amélioration d'impact, de classification ou de décision n'est acquise simplement parce qu'un modèle pourrait l'estimer.

**Référence de cadrage :** `main` consulté le 27 octobre 2026. Ne jamais figer cette lecture comme état courant lors d'une exécution ultérieure.

## 2. Priorités 2027, dans l'ordre

| Rang | Priorité | Fenêtre cible | Livrable observable | Dépendance ou STOP CONDITION |
|---:|---|---|---|---|
| D01 | **P0. Parcours Actions web de bout en bout** | T4 2026 / T1 2027 | Un bénévole ou organisateur peut préparer, enregistrer, reprendre et finaliser une action sans perte de données | Scénarios réels et erreurs/reprises couverts ; sinon pas de déclaration de clôture |
| D02 | **P0. Rapports d'impact fiables et réutilisables** | T1 2027 | Rapport d'une action admissible, snapshot historique, export et restitution véridique | Provenance, `NA`, permissions, reproductibilité et téléchargement effectivement testés |
| D03 | **P0. Sécurité, conformité et intégrité transversales** | Continu | Frontières AuthN/AuthZ/RLS et traitement de données protégés sur les parcours modifiés | Toute violation de données ou de droits bloque la livraison concernée |
| D04 | **P0. Retours terrain et instrumentation minimale** | T1 / T2 | Anomalies triées à partir des cleanwalks, mesures de conversion et complétion utiles | Consentement, base de mesure et source des métriques établis |
| D05 | **P1. Simplification UX web mobile-first** | T1 / T2 | Les écrans Actions, Rejoindre et Reports sont utilisables sans aide du développeur | Corriger d'abord les blocages effectivement observés |
| D06 | **P1 conditionnel. V1 native GPS et parcours terrain** | T2 / T3 | Validation sur appareils réels, reprise, sync, sécurité, build signé si faisable | Release uniquement après contrôles natifs et publication autorisée |
| D07 | **P1. Qualité de la donnée géographique et scientifique** | T2 / T3 | Cartes et rapports distinguent observations, historique, estimations et zones propres | Aucun proxy présenté comme mesure ou état en temps réel |
| D08 | **P1 conditionnel. Continuité d'engagement** | T2 / T4 | Organisateurs et bénévoles retrouvent leurs actions, invitations et prochains rendez-vous | Besoin de réutilisation observé ; ne pas recréer la communauté |
| D09 | **P2 conditionnel. Besoins des partenaires** | T3 / T4 | Corrections ciblées des exports, bilans et accès organisationnels réellement nécessaires | Partenaire pilote, usages et droits prouvés ; pas de portail payant anticipé |
| D10 | **P2. Performance, coûts et maintenabilité mesurés** | Continu / T4 | Réduction démontrée d'un coût ou risque existant, sans refonte globale | Baseline comparable et tests de parité, sinon ne rien optimiser |
| D11 | **P3 exploratoire. IA utilisateur** | T3 / T4 | Étude de faisabilité ou petit essai réversible, seulement si besoin concret | Qualité, confidentialité, coût, évaluation et bénéfice établis avant intégration |

Les rangs indiquent la priorité métier, **pas onze chantiers à lancer simultanément**. Les garanties de sécurité, données et authentification s'appliquent à chacun des lots.

## 3. Lots de travail et critères d'acceptation

### D01. Parcours Actions web : rendre l'usage terrain autonome

**Propriétaires à inspecter :** `/actions/new`, `/sections/rejoindre-une-action`, `/signalement`, `apps/web/src/lib/actions/`, routes API et migrations/contrats réellement consommés.

- Tester pré-action, brouillon, sauvegarde/reprise, connexion tardive, validation, passage en fin d'action et relecture depuis la persistance.
- Tester inscriptions, organisateurs/coorganisateurs, présence **effectivement confirmée** et demandes de rattachement séparément ; ne jamais convertir inscription ou qualité d'organisateur en preuve automatique de présence.
- Vérifier géométrie, tracés importés ou dessinés, itinéraires, photos, retries et gestion des erreurs partielles selon les chemins utilisés.
- Corriger seulement les frictions établies lors du pilote : champs incompris, longueur du formulaire, navigation mobile, manque de retour d'erreur, doublons ou perte de brouillon.

**Terminé quand :** plusieurs scénarios terrain représentatifs passent de la préparation à la relecture serveur, dont un refus d'accès et un échec/reprise. Si un problème externe empêche la preuve, déclarer `BLOCKED` ou `PARTIEL` et non `PASS`.

### D02. Rapports, indicateurs et exports

**Propriétaires :** `/reports`, moteur `apps/web/src/lib/reports/`, `apps/web/src/lib/pdf-export/`, contrats scientifiques et snapshots existants.

- Vérifier la sélection admissible d'une action et des périmètres, le calcul, l'aperçu, le PDF, l'historique et les exports JSON/CSV issus d'un snapshot cohérent.
- Garantir que `0` réellement observé, `NULL`, `NA`, donnée partielle, mesure et proxy ont des significations distinctes.
- Vérifier que les thèmes Impact/Scientifique ne modifient pas la donnée ; contrôler textes, unités, sources, limites et comparabilité.
- Étudier avec un pilote l'usage réel du document : lisibilité, utilité pour une association, partage autorisé et corrections factuelles demandées.
- Tester la révocation et l'expiration des partages PDF existants **seulement si leur déploiement et leur usage sont confirmés** ; une migration versionnée ne prouve pas l'état distant.

**Terminé quand :** un rapport réalisé à partir d'une action valide est correctement relu, réexporté, interprété et utilisé par un destinataire réel, sans calcul ou accès non autorisé.

### D03. Sécurité, confidentialité et stabilité

**Périmètre transversal obligatoire, sans campagne hors sujet :**

- Clerk principal sur web et mobile ; pas d'Auth Supabase parallèle ; AuthZ serveur avec capacité, scope, ownership et état de ressource.
- RLS et grants conformes aux actions exécutées, y compris en cas de mutation, identifiant d'une autre personne, rôle erroné et demande répétée.
- Données privées, photos, localisation GPS, consentements, rapports et liens de partage servis selon les règles existantes.
- Vérification des migrations, tests exécutés et état runtime séparément ; aucun contournement `service_role` client, aucun secret dans le dépôt.
- Observabilité et budgets fournisseurs : privilégier la prévention d'abus et la mesure des erreurs plutôt que l'introduction préventive de services supplémentaires.

**Terminé quand :** les invariants sensibles touchés par chaque livraison disposent des preuves adaptées à leur niveau de risque, avec blocages explicites.

### D04. Instrumentation utile et apprentissage terrain

- Définir les événements et dénominateurs utiles sans réinventer les analytics : consultation d'une action, début/fin de formulaire, inscription, action finalisée, génération de rapport, réutilisation par organisateur.
- Distinguer événements instrumentation, données métier canoniques et taux calculés ; vérifier conformité RGPD/consentements avant toute collecte supplémentaire.
- Après chaque cleanwalk, rapprocher un retour humain et un incident technique du scénario reproduit ; corriger les causes fortes, pas toutes les idées de fonctionnalité.
- Conserver un suivi minimal des régressions et des blocages de parcours, compatible avec les systèmes d'observabilité actuels.

**Terminé quand :** il est possible d'identifier où se perd un utilisateur et de relier une correction à une amélioration mesurée, sans collecte excessive.

### D05. Expérience web mobile-first et accessibilité

- Priorité aux formulaires Action et aux pages consultées avant/pendant/après une cleanwalk.
- Clarifier étapes, champs obligatoires, erreurs, récupération de brouillon, loading/empty/error/forbidden, accès clavier et lecteurs d'écran.
- Vérifier la lisibilité et la fluidité sur téléphone et réseau dégradé ; préserver les vrais composants, valeurs et design system.
- Respecter `documentation/plans/PLAN_MACRO_LOTS_UI_UX_CODEX.md` : ne pas dupliquer ses lots ni contourner ses protections de la matrice UI/UX.

**Terminé quand :** un nouvel organisateur réalise le flux central sans intervention du développeur dans un test utilisateur contextualisé. Une simple amélioration esthétique n'est pas une preuve de succès.

### D06. Mobile Expo : livrer seulement une V1 démontrable

**Propriétaires :** `apps/mobile/AGENTS.md`, app Expo, passerelles `/api/mobile/`, identité et contrats GPS existants.

- Revalider les trois destinations `Agir`, `Carte`, `Compte` et les parcours métier déjà implémentés, sans en créer une copie ni réécrire le backend web.
- Tester permissions et explication du GPS, carte/tracé, interruption d'activité, changement de compte, stockage owner-scoped, reprise offline, synchronisation, finalisation serveur et accès refusés.
- Arbitrer le background headless à partir des usages et contraintes plateforme réellement constatés, sans présumer qu'il fonctionne.
- Vérifier les exigences natives à la date du lot : `expo-doctor`, configuration, versions, autorisations Android/iOS, éventuels comptes stores, politique de confidentialité et tests sur appareils physiques.
- Si les critères ne sont pas satisfaits, conserver la V1 en développement, avec web mobile comme parcours de secours explicite.

**Terminé quand :** un parcours GPS et au moins un parcours Agir représentatif sont fiables en conditions terrain, les interruptions sont maîtrisées et un artefact de distribution est réellement validé si la publication est décidée. Pas de date de store imposée.

### D07 à D09. Qualité cartographique, engagement et partenaires

- **D07 :** fiabiliser géométries, projections et exports cartographiques selon la méthodologie existante ; les prévisions de re-pollution restent des hypothèses versionnées, jamais une observation actuelle.
- **D08 :** simplifier la découverte des prochaines actions et le suivi personnel depuis les surfaces actuelles ; vérifier notifications, messagerie, annuaire et gamification seulement sur les trajets utilisateurs réellement activés.
- **D09 :** traiter les demandes récurrentes des pilotes : rapports sélectionnés, exports autorisés, partage, visibilité des actions et suivi d'organisation. Toute gestion multi-organisations, facturation ou tenancy attend une décision produit/juridique et une véritable relation autorisable.

**Terminé quand :** le besoin est documenté par un usage répété et le changement a une preuve d'impact, ou bien le lot est clos sans ajout s'il n'existe pas de besoin confirmé.

### D10. Coûts, qualité et robustesse

- Exploiter les gardes, suites de tests, logs et budgets déjà prévus par le dépôt.
- Chercher une baseline avant toute optimisation de requête, cache, pagination, export ou fonction serverless.
- Corriger les régressions démontrées et les scans/lectures incomplètes ; respecter les propriétaires des calculs et les frontières SQL/TypeScript.
- Ne pas introduire MongoDB, BigQuery, Spark, service IA, abstraction générique ou réécriture complète pour « anticiper le passage à l'échelle ».

**Terminé quand :** un gain mesuré ou un risque réellement supprimé est prouvé avec parité fonctionnelle ; sinon aucune modification n'est requise.

### D11. IA produit, uniquement après cadrage

L'usage de Codex pour intégrer le code est distinct de l'ajout d'une fonctionnalité d'IA aux utilisateurs.

- Recueillir un cas d'usage précis : par exemple aide à la saisie ou synthèse **assistée et vérifiable** d'informations déjà disponibles, si plusieurs utilisateurs le demandent.
- Mesurer la valeur par rapport à une règle déterministe ou un formulaire plus simple ; inclure hallucinations, confidentialité, coût à l'usage, biais, erreurs et dépendance fournisseur.
- Ne jamais faire produire automatiquement une masse collectée, un chiffre de CO2 « évité », une position GPS ou une conclusion scientifique présentée comme observée.
- Exiger une évaluation sur données non sensibles ou explicitement autorisées avant tout essai réel, avec possibilité de désactivation.

**Terminé quand :** une preuve d'utilité et un contrat de risques existent. En leur absence, statut `DEFERRED`, sans implémentation.

## 4. Séquencement indicatif

| Échéance | Chantiers activables | Décision de sortie |
|---|---|---|
| **T4 2026** | Retour du pilote étudiant de novembre si réalisé ; inventaire des blocages Actions/Reports ; priorisation | Sélection des défauts P0 démontrés, pas de refonte générale |
| **T1 2027** | D01, D02, D03 ; démarrage de D04 sur événements fiables | Parcours action + rapport vérifiés sur cas réalistes |
| **T2 2027** | D04, D05, début des validations D06 ; D07 au besoin | Usages terrain documentés, mobile techniquement évalué |
| **T3 2027** | D06 sous réserve de release gate ; D08 et D09 selon partenariats | Publication native ou report motivé ; améliorations partenaires uniquement prouvées |
| **T4 2027** | D07 à D10 ciblés, D11 éventuellement ; revue de l'architecture/coûts | Clôture des vrais blocages et décision produit 2028 avec preuves |

L'agenda est recalibré tous les trimestres à partir des preuves de la roadmap hors code. Une action ou un partenaire non confirmé ne déclenche pas automatiquement un chantier.

## 5. Interface explicite avec la roadmap hors code

| Preuve terrain/business entrante | Conséquence de développement autorisée |
|---|---|
| Échec de création d'action observé | Correction P0 Actions et test de non-régression |
| Association incapable d'exploiter un rapport | Correction ciblée de restitution/partage/explication, sans inventer de KPI |
| Plusieurs organisateurs demandent une simplification identique | UX/flow ciblé, comparaison avant/après |
| Usage répété du GPS en conditions contrôlées | Priorisation des corrections mobiles et éventuelle publication |
| Contrat ou programme territorial signé avec obligations réelles | Adaptation minimale des exports/droits, après analyse juridique |
| Aucune demande réelle de module payant ou IA | `NO_ACTION` : ne pas construire de fonctionnalité spéculative |

## 6. Règles d'exécution Codex

1. **ChatGPT prépare le problème, la décision et le périmètre** sur `main`, puis fournit si nécessaire un lot d'intégration autonome ; ne pas déléguer systématiquement l'analyse à Codex.
2. **Codex intègre dans le checkout autorisé** selon `AGENTS.md` et les `AGENTS.md` scoped ; il préserve les modifications parallèles, vérifie les callers/consommateurs et ne traite aucun plan comme supérieur au runtime.
3. Chaque lot déclare objectif, owner, scénario positif, scénario interdit/limite, preuves, impacts documentaires et `STOP CONDITION`.
4. Exécuter les validations adaptées au domaine, sans assimiler `STATIC_CONTRACT`, `EXECUTED_BEHAVIOR` et `INTEGRATION_PROOF`, ni un mock à un test base/auth réelle. Documenter `NOT_EXECUTED`, `BLOCKED` et les limites.
5. Les changements durables mettent à jour les sources canoniques spécialisées et les fiches de page concernées. Ne pas modifier les zones protégées hors autorisation, notamment la matrice UI/UX avant son lot 12.
6. Intégration, validation, commit et publication suivent la gouvernance du dépôt par Codex. Après publication, relire `main` avant de considérer le lot clos.
7. Aucun grand chantier ne naît d'un simple score de couverture, d'une alerte ancienne, d'une piste IA ou d'une amélioration cosmétique.

## 7. Mesure, conditions d'arrêt et revue trimestrielle

| Dimension | Définition minimale | Source à consolider |
|---|---|---|
| Complétion Actions | Actions finalisées / actions commencées, selon période et population explicites | Contrat Actions + événements instrumentés |
| Qualité des données | Dossiers complets, mesures inconnues, incohérences corrigées | Données métier admissibles et validation |
| Fiabilité de restitution | Taux de génération réussie, régénérations identiques, erreurs d'export | Reports, snapshots et logs autorisés |
| Utilité du rapport | Rapports réellement consultés/utilisés par les organisateurs | Retour terrain documenté, non seul compteur de téléchargements |
| Mobile | Scénarios GPS réussis et incidents de reprise/sync sur appareils réels | Protocole de test mobile daté |
| Coût et sécurité | Coût mensuel réel, erreurs, refus d'accès, latence et charges | Factures, monitoring, contrôles ciblés |

**Ne pas fixer de taux cible ou résultat observé sans baseline.** Les nombres de sessions, de participants et d'organisations sont pilotés par la roadmap hors code, qui ne doit pas devenir une seconde source runtime.

**STOP CONDITION globale 2027 :** les flux critiques sont exploitables sur des actions réelles, les rapports restent interprétables et traçables, les permissions sont préservées, et chaque extension produit est justifiée par un usage ou un risque documenté. L'absence de preuve bloque une revendication de réussite, pas la possibilité de clôturer un chantier devenu sans objet.

## 8. Références canoniques

- [`roadmap-priorisee.md`](../product/roadmap-priorisee.md) : ordre produit et priorités P0/P1/P2.
- [`vision-et-objectifs.md`](../product/vision-et-objectifs.md) : problème, acteurs et limites.
- [`SCIENTIFIC_PROTOCOL.md`](../product/SCIENTIFIC_PROTOCOL.md) et [`methodologie-carte-actions.md`](../product/methodologie-carte-actions.md) : statuts de mesure, proxy et projections.
- [`business-model.md`](../product/business-model.md) : hypothèses économiques, pas un contrat de facturation.
- [`PLAN_MACRO_LOTS_UI_UX_CODEX.md`](./PLAN_MACRO_LOTS_UI_UX_CODEX.md) : lots UX déjà planifiés et protections de matrice.
- [`master-architecture.md`](../architecture/master-architecture.md) et [`TESTING.md`](../development/TESTING.md) : frontières et niveaux de preuve.
- [`apps/mobile/AGENTS.md`](../../apps/mobile/AGENTS.md), [`AGENTS.md`](../../AGENTS.md), [`CHATGPT.md`](../../CHATGPT.md) : exécution et règles scoped.
