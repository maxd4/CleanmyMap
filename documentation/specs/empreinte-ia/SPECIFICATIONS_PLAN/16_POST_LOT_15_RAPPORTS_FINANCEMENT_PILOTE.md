# LOT 16 : Rapports professionnels, partenaires et dossiers de financement

Type : lot XL. Statut : PLAN, après lot 15. Références : `01` §15 et `17_CADRE_RSE_REGLEMENTATION_PILOTE.md`. Les rapports du produit existant sont un owner à réutiliser ; l'export salarié est livré au lot 14.

## Objectif

Fournir un rapport professionnel vérifiable reliant mobilisation des salariés, Actions et quantités effectivement attribuées à une structure, puis un dossier de financement exploitable par une direction, une association ou un financeur. **Aucune promesse de neutralité numérique, de crédit carbone, de conformité BEGES/CSRD ou d'éligibilité fiscale.**

## Jalon 1 : projection rapport et contrôles de preuve

- Étendre les services de rapports existants (`apps/web/src/lib/reports/`, `report-generation-*`, PDF et partages révocables), sans deuxième moteur PDF, sans envoyer les dossiers privés vers `report_generation_publications` ni élargir leurs droits. Un rapport professionnel est une projection de sources qualifiées, pas une copie persistée de données personnelles brutes.
- Deux ensembles de mesures **non additionnables** : **Mobilisation** (participants uniques ayant accepté le partage, actions finalisées, éventuellement présence documentée sans crédit de masse) et **Attribution** (kg/mégots effectivement affectés à la structure, provenance et révisions). Également afficher le total physique de l'action comme **contexte distinct**, jamais comme contribution supplémentaire de l'entreprise.
- Chaque chiffre du rapport porte au minimum période, unité, source, scope, statut `mesuré|attribué_estimé|NA`, couverture, méthode/version, action ou référence opaque, et horodatage de génération. Un manque de mesure reste `NA`. Corrections et réaffectations sont reflétées dans les nouvelles générations ; les précédentes restent consultables comme états historiques avec mention `superseded` ou `potentially_outdated`.
- La section IA est optionnelle, **séparée** : uniquement un bilan de source professionnelle dont le responsable atteste la provenance, ou des éléments explicitement partagés avec un droit adapté. Ne pas reconstruire une consommation organisationnelle depuis les imports privés des salariés ; ne jamais soustraire à ces émissions des kg/mégots ou des 500 L.

## Jalon 2 : dépenses et justification financière

- Permettre de documenter un financement d'action ou partenariat via les seuls champs nécessaires : financeur identifié et autorisé, action/projet, type `prestation|subvention|don|mécénat déclaré|autre`, statut `prévu|engagé|versé|dépensé|justifié`, montant, devise, date, référence interne de justificatif et note de périmètre. Aucune transaction bancaire, reçus fiscaux ou contrôle automatique d'éligibilité. Toute référence financière non vérifiée reste déclarative.
- Si un domaine de financement et justificatifs approprié existe dans le checkout à l'exécution, le réutiliser ; sinon ajouter uniquement le contrat privé minimal, owner-scoped par structure/dossier, droits de création/lecture/correction séparés et audit. Ne pas exposer les références financières dans la bibliothèque publique ni un dossier de salarié.
- Générer deux modèles depuis la même projection : `Bilan RSE d'engagement territorial` (actions, personnes ayant partagé, quantités attribuées, méthodologie, exclusions) et `Dossier de partenariat/financement` (besoin, ressources engagées, activités, résultats effectivement observés, justificatifs et limites). Les objectifs futurs ou nombres promis ne doivent jamais être présentés comme réalisés.
- Ajouter éventuellement des ratios **financiers descriptifs** calculés uniquement avec numérateur et dénominateur admissibles, par exemple `euros dépensés / actions effectivement finalisées`, avec unité et couverture ; si données insuffisantes `NA`. Ne pas déduire un ROI carbone ou « coût par litre d'eau sauvé » des mégots.

## Jalon 3 : partage externe et validation des prétentions

- Export depuis une structure vérifiée : aperçu avant publication, contrôle des chiffres, sélection explicite des rubriques, suppression de données individuelles non autorisées, PDF daté avec référentiel de méthodes et état des preuves. Partage limité aux destinataires autorisés, liens expirants, révocation, séparation stricte des rapports privés et de la bibliothèque publique. Un PDF téléchargé ne peut pas être révoqué à distance ; prévoir une URL/statut de contrôle de validité et un avertissement de révision.
- Intégrer les garde-fous rédactionnels du fichier `17` : ne pas formuler « empreinte IA nulle », « carbone compensé », « pollution de l'eau annulée », « certifié », « mécénat éligible » ou « conformité CSRD/BEGES garantie ». Autoriser « n personnes ont participé à x actions » et « y kg attribués à cette structure » quand les preuves et droits le démontrent.
- Respecter les contraintes RGPD et de sécurité, notamment masquage des petits groupes, accès aux pièces de financement par rôle précis, absence de classement individuel, audience et durée de rétention configurables par politique documentée, pas de nouvel accès public aux relevés IA personnels.

## Validation

Tests de réconciliation avec les parts effectives, réattributions, corrections, dates, sources inconnues, données tronquées, montant prévu/versé/dépensé et pièces inexistantes ; absence de doublon Action + structure, absence de somme de conventions hydriques et ACV, non-addition des bénéfices terrain aux émissions IA, PDF généré depuis données minimales, interdiction de publication publique et expiration/révocation. Tests de sécurité multi-comptes et multi-structures, RLS/grants réellement exécutés, E2E navigateur, PDF, responsive, fr/en, typecheck/lint/coverage, docs CURRENT. Ne pas promettre de conformité légale certifiée.

## STOP CONDITION

Un représentant vérifié peut produire et partager de manière maîtrisée un bilan professionnel documenté ainsi qu'un dossier de financement traçable, sans compter deux fois la collecte, sans exposer de salariés non partageants et sans transformer des objectifs symboliques en compensation ou en reçu fiscal.