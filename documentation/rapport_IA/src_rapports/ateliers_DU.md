ATELIERS_DU - BACKLOG OPERATIONNEL CLEANMYMAP

NOTE D'USAGE

Ce document sert de backlog actif des messages et lots encore actionnables.
Le cadre d'analyse DU, les apprentissages et les justifications IA ont ete migres vers :

- `documentation/plans/impact_IA.md` pour la gouvernance IA, la sobriete et les arbitrages ;
- `documentation/plans/journal_impact_DU.md` pour le narratif DU et la trace d'apprentissage ;
- `documentation/product/*` pour la vision produit, les publics et la feuille de route ;
- `documentation/operations/session-standard-runbook.md` pour les regles de validation de lots.

1. Acquis deja en place (a ne pas re-implementer)

- Parcours applicatifs coeur actifs: /dashboard, /reports, /actions/new, /actions/map, /actions/history, /admin.
- Registre de rubriques/sections operationnel.
- APIs metier principales en production (actions, spots, community, reports, moderation, health/services).
- Base de securisation initiale (middleware, env centralisee, RLS de base).
- Audit d'Impact IA normalise (`documentation/plans/impact_IA.md`) et valide.
- Automatisation des metriques de documentation (`update-audit-stats.mjs`).
- Premiers livrables PDF/exports disponibles.

1. Hors perimetre direct du produit web (a traiter ailleurs)

- Gouvernance RH interne non numerique.
- Negociation politique/institutionnelle hors outil.
- Comptabilite et obligations administratives non applicatives.
- Logistique terrain physique (materiel, transport, stockage).
- Process juridiques complets hors code.

1. Chantiers implementables non finalises (priorises)

Priorite immediate

- Tests de non-regression cibles sur les parcours coeur et les exports.
- Validation humaine et clarte des contenus environnementaux.
- Fiabilite des indicateurs et protocole de revue mensuelle.

Priorite moyen terme

- Clarification structurelle des pages coeur pour supprimer les doublons analytiques.
- Campagnes multi-actions et suivi associe.
- Standardisation des usages IA utiles et politique de partage de donnees.

Priorite consolidation et perennisation

- Refactor `section-renderer` sans regression fonctionnelle.
- Tracabilite documentaire unique (source of truth) a maintenir a jour.
- Mitigation du vendor lock-in (strategie de sortie Vercel/Supabase) a prolonger par inventaire technique.
- Routine d'audit trimestrielle (Responsable Sobriete).
- Verification finale complete et synthese des risques restants.

1. Succession de messages a m'envoyer (execution directe)

Messages fermes / absorbes

- Audit initial des ecarts : absorbe par `documentation/plans/ateliers_DU_execution_rapide.md`.
- Securite publication : absorbee par `scripts/pre-release-check.mjs` et `documentation/operations/pre-release-security-check.md`.
- Observabilite admin centralisee initiale : absorbee par l'enrichissement de `/api/services`, l'affichage admin et les tests de contrat.
- Convergence exports serveur/UI : absorbee par les helpers communs de headers et de messages, avec tests associes.
- Tracabilite documentaire : absorbee par `documentation/architecture/traceability-matrix.md`.
- Strategie de sortie technique : absorbee au niveau socle par `documentation/operations/vendor-exit-strategy.md`.
- Dossier de validation institutionnelle : absorbe par `documentation/plans/dossier_validation_institutionnelle.md`.

Backlog actif unique

Priorite 1 - Risque produit et gouvernance

Message A
"Ajoute la couverture de non-regression manquante sur `/dashboard` et `/reports`, sans casser les tests deja poses sur `/api/services`, `/api/reports/actions.csv`, `/api/reports/actions.json`, `/api/reports/elus-dossier` ni les boutons d'export. Livre les tests, la liste des trous de couverture restants et le risque residuel."

Message B
"Implemente un workflow de validation humaine des contenus environnementaux et institutionnels, avec statut brouillon/revue/publication, responsable identifie et niveau de preuve explicite. Ne modifie pas le fond des contenus sans tracer la distinction fait/hypothese. Livre le workflow, la preuve de validation et les controles associes."

Message C
"Renforce la fiabilite des indicateurs via des controles de coherence funnel/engagement/exports, un protocole de revue mensuelle et des seuils d'alerte documentes. Ne casse ni le dashboard, ni les exports, ni le pilotage existant. Livre les controles, la documentation et les anomalies encore non couvertes."

Priorite 2 - Clarification produit

Message D
"Redefinis la responsabilite de `/dashboard`, `/reports`, `/pilotage` et `/observatoire`, puis supprime les doublons analytiques entre ces pages sans retirer d'information utile ni casser les parcours coeur. Livre la repartition des roles par page, les simplifications retenues et les points restant a arbitrer."

Message E
"Cree une politique d'usage IA et de partage des donnees vers des services externes, avec cas autorises, cas interdits, anonymisation minimale et controle avant partage. Ne laisse aucune regle implicite. Livre la politique, la checklist de controle et les cas limites."

Message F
"Implemente le lot campagnes multi-actions avec modele, API, UI de suivi et integration minimale aux flux existants. Ne casse ni declaration, ni carte, ni historique, ni reporting. Livre le schema retenu, les tests critiques et les limites restantes."

Priorite 3 - Consolidation technique

Message G
"Decoupe `section-renderer` en sous-modules sans changer le comportement visible des sections coeur. Valide par tests smoke et signale les points de couplage encore trop forts. Livre le decoupage, les tests et les risques restants."

Message H
"Prolonge la mitigation du lock-in par un inventaire technique detaille des points de couplage `Vercel`, `Supabase` et `Clerk`, puis ajoute les scripts d'export ou de restauration encore manquants. Ne duplique pas la strategie existante : complete-la par des preuves techniques concretes. Livre l'inventaire, les scripts et les lacunes restantes."

Message I
"Execute une verification finale transverse des lots encore ouverts dans `ateliers_DU`, corrige les anomalies detectees sans regression et fournis la synthese finale : risques restants, dettes assumees, lots clos et plan de suite."

Messages conditionnels

Message J
"Mets a jour la matrice de tracabilite documentaire uniquement si des routes, composants coeur ou APIs ont change depuis la derniere version. Livre la delta exacte et la preuve de coherence."

Message K
"Regenere le dossier de validation institutionnelle uniquement si un lot modifie l'audit d'impact IA, la gouvernance, la maintenance ou la strategie de sortie. Livre les liens mis a jour et les pieces ajoutees."
