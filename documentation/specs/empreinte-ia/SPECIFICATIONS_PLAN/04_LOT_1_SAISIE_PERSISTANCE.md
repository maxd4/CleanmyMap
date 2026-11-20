# Prompt Codex : Lot 1/3, déclaration, UI et persistance personnelle

**Type : LOT XL / réécriture de l'ancien prompt de déclaration.** À exécuter après le lot 0 scientifique. Le prompt est autonome ; `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md` et `02_SOURCES_ET_FIXTURES_API.md` peuvent être fournis comme décisions candidates.

```text
LOT 1/3 : « Mon empreinte IA » - déclaration anonyme et sauvegarde personnelle sécurisée.

OBJECTIF
Livrer le parcours Web complet de déclaration IA, calcul sans compte et persistance facultative owner-scoped. Consommer exclusivement le noyau personal-ai-estimator fiabilisé au lot 0 et les contrats AuthN/AuthZ/Supabase existants, sans dupliquer le suivi administratif Codex ni les snapshots environnementaux du projet.

JALON 1 : CONTRAT DE DÉCLARATION
- Déclaration structurée : fournisseur de données, environnement cloud/local, modèle brut et modèle canonique si connu, éditeur déduit uniquement du catalogue, opérateur d'inférence distinct et potentiellement inconnu, région d'inférence facultative, niveau de raisonnement si attesté, catégorie d'usage, période UTC [début,fin[, granularité (requête ou période), nombre de requêtes et catégories de tokens.
- Conserver inputTotal, cacheRead, cacheWrite, inputUncached, outputVisible, outputTotal, reasoningRelation (included/additional/unknown), multimodalité et total déclaré séparément. Le zéro explicite est distinct de null ; aucune soustraction arbitraire ou calcul EcoLogits par requête sur un bucket agrégé.
- Parcours local : énergie IT/facility/local wall réellement mesurée, OU puissance moyenne/durée documentées, OU charge/vide différentielles ; afficher le niveau de preuve propre à chaque frontière. Coût et devise indépendants de l'énergie.
- Valider côté domaine et côté API entiers sûrs, unités, ordre des dates, total/cache/raisonnement cohérents, nombres finis, longueurs, scopes, provenance et taille des structures ; retour explicite sur champs impossibles sans transformer les inconnus en zéro.

JALON 2 : PERSISTANCE ET AUTORISATION
- Introduire une unique source métier privée pour les déclarations personnelles avec identifiant propriétaire Clerk, période, source, état actif/exclu, contenu normalisé minimal, version méthodologique, facteurs et snapshot de calcul ; migrations forward-only sous apps/web/supabase/migrations/ et RLS/grants cohérents avec l'authentification Clerk du repo.
- API auth-required pour créer, lister, corriger, exclure/réactiver et supprimer une déclaration ; id adressé contrôlé côté serveur, pas d'IDOR. Pagination, bornage et no-store pour données privées. Aucun accès depuis les routes publiques ou le service_role sans garde adapté.
- Calcul local anonyme sans persistance, aucun token/propos de conversation ni nom de facture enregistré. Enregistrement seulement après CTA explicite et connexion. Préserver les snapshots existants du projet et le schéma admin Codex.

JALON 3 : UI ET DOCUMENTATION
- Créer la page propre « Mon empreinte IA » accessible sans compte avec mode calcul anonyme et UI progressive : choisir un modèle/« autre », période, tokens, niveau de raisonnement, cloud/local, région et détails avancés ; résumé sources, données manquantes et résultats énergie/CO2/eau/ACV partielle ou NA, comparaison cleanwalk du lot 0.
- Boutons Calculer, Enregistrer (authentifié), Modifier, Exclure, Supprimer, avec confirmation de suppression. Lien secondaire cohérent depuis /methodologie sans modifier artificiellement la navigation primaire. Palette Impact et composants CMM ; états loading/erreur/vide, responsive, clavier et modes d'affichage.
- Documenter contrat personnel, entrée locale, provenance, confidentialité, données manquantes, stockage, droits, durée/suppression et fiche CURRENT de la page ; mettre à jour SCIENTIFIC_PROTOCOL si les contrats visibles changent.

VALIDATION
Tests du domaine et de la sérialisation, entrée partielle, cohérence des catégories fournisseur, local/cloud, null/zero, code HTTP public/authentifié, CRUD et isolation comptes A/B, id falsifié et accès après suppression. Preuve RLS exécutée en CI PostgreSQL éphémère, en distinguant STATIC_CONTRACT et INTEGRATION_PROOF. Tests navigateur de bout en bout du calcul anonyme et du cycle sauvegarder/corriger/supprimer ; typecheck, lint, couverture Web ciblée et gouvernance documentaire. Vérifier les consommateurs Mobile du contrat sans dupliquer l'UI mobile.

STOP CONDITION
Un utilisateur anonyme calcule effectivement une estimation, un utilisateur connecté peut sauvegarder et gérer uniquement ses relevés, et ni les inconnues ni les données privées ne contaminent les métriques du projet.
```