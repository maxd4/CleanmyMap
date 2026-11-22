# Prompt Codex : Lot 1/3, déclaration, UI et persistance personnelle

> **Statut documentaire : PLAN.** **Type : LOT XL / réécriture de l'ancien prompt de déclaration.** Cette spécification historique décrit le périmètre fonctionnel restant et ne demande pas de relancer le lot déjà exécuté. Les décisions scientifiques et produit transversales appartiennent à [01](./01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md), [02](./02_SOURCES_ET_FIXTURES_API.md) et [24](./24_ARBITRAGES_PREUVES_ET_PRIORITES.md).

**État vérifié le 22 novembre 2026 sur le `main` publié avant le complément XL :** le code de déclaration privée et le parcours rapide sans tokens sont publiés. L’estimation rapide anonyme passe l’E2E public. La persistance authentifiée et la preuve PostgreSQL/RLS restent non établies. Le formulaire technique classique envoyait une déclaration normalisée incompatible avec l’API stricte; le complément XL envoie maintenant le brouillon HTTP attendu afin que le serveur reste l’owner de la normalisation canonique. La régression UI/API create-edit et le test navigateur public rapide passent; la preuve PostgreSQL/RLS et l’E2E authentifié restent à obtenir dans la lane autorisée. Le backlog de preuve et les liens CI précis sont tenus dans [24](./24_ARBITRAGES_PREUVES_ET_PRIORITES.md).

```text
LOT 1/3 : « Mon empreinte IA » - déclaration anonyme et sauvegarde personnelle sécurisée.

OBJECTIF
Livrer le parcours Web complet de déclaration IA, calcul sans compte et persistance facultative owner-scoped. Consommer exclusivement le noyau personal-ai-estimator fiabilisé au lot 0 et les contrats AuthN/AuthZ/Supabase existants, sans dupliquer le suivi administratif Codex ni les snapshots environnementaux du projet.

JALON 1 : CONTRAT DE DÉCLARATION
- Déclaration structurée : fournisseur de données, environnement cloud/local, modèle brut et modèle canonique si connu, éditeur déduit uniquement du catalogue, opérateur d'inférence distinct et potentiellement inconnu, région d'inférence facultative, niveau de raisonnement si attesté, catégorie d'usage, période UTC [début,fin[, granularité (requête ou période), nombre de requêtes et catégories de tokens.
- Distinguer canal d'utilisation (chatbot, API, agent, local), type d'accès économique (gratuit, abonnement payant, paiement à l'usage, inconnu) et provenance ; conserver la compatibilité avec l'enum access CURRENT et ne pas transformer un forfait en compteur énergétique.
- Conserver inputTotal, cacheRead, cacheWrite, inputUncached, outputVisible, outputTotal, reasoningRelation (included/additional/unknown), multimodalité et total déclaré séparément. Le zéro explicite est distinct de null ; aucune soustraction arbitraire ou calcul EcoLogits par requête sur un bucket agrégé.
- Parcours local : énergie IT/facility/local wall réellement mesurée, OU puissance moyenne/durée documentées, OU charge/vide différentielles ; afficher le niveau de preuve propre à chaque frontière. Coût et devise indépendants de l'énergie.
- Valider côté domaine et côté API entiers sûrs, unités, ordre des dates, total/cache/raisonnement cohérents, nombres finis, longueurs, scopes, provenance et taille des structures ; retour explicite sur champs impossibles sans transformer les inconnus en zéro.

JALON 2 : PERSISTANCE ET AUTORISATION
- Introduire une unique source métier privée pour les déclarations personnelles avec identifiant propriétaire Clerk, période, source, état actif/exclu, contenu normalisé minimal, version méthodologique, facteurs et snapshot de calcul ; migrations forward-only sous apps/web/supabase/migrations/ et RLS/grants cohérents avec l'authentification Clerk du repo.
- API auth-required pour créer, lister, corriger, exclure/réactiver et supprimer une déclaration ; id adressé contrôlé côté serveur, pas d'IDOR. Pagination, bornage et no-store pour données privées. Aucun accès depuis les routes publiques ou le service_role sans garde adapté.
- Calcul local anonyme sans persistance, aucun token/propos de conversation ni nom de facture enregistré. Enregistrement seulement après CTA explicite et connexion. Préserver les snapshots existants du projet et le schéma admin Codex.
- Le payload HTTP transmis par le formulaire doit correspondre au schéma serveur strict : brouillon brut en entrée, normalisation canonique et snapshot côté serveur. Tester le vrai consommateur navigateur/API pour POST et PATCH ; ne pas affaiblir les rejets de champs inconnus.

JALON 3 : UI ET DOCUMENTATION
- Garder la page unique « Mon empreinte IA » accessible sans compte avec UI progressive. Trois entrées compatibles : estimation rapide sans tokens, import (lot 2), mode avancé avec tokens et frontières physiques. L'estimation rapide présente les hypothèses ; elle ne fabrique jamais une mesure.
- Estimation rapide : chatbot ou « autre », gratuit/abonnement/inconnu, période, fréquence ou échanges déclarés, longueurs habituelles des questions/réponses facultatives. Si la chaîne caractères -> tokens hypothétiques -> scénario énergétique n'est pas défendable, retourner énergie NA et proposer une simulation indépendante, plutôt qu'un chiffre personnel inventé. Cas image/audio/vidéo/agent non calibrés : NA sur leur impact physique, texte partiel explicitement qualifié.
- Un formulaire avancé conserve modèle/« autre », période, tokens, niveau de raisonnement, cloud/local, région et détails ; résumé sources, données manquantes et résultats énergie/CO2/eau/ACV partielle ou NA, comparaison terrain non compensatoire du lot 0.
- Boutons Calculer, Enregistrer (authentifié), Modifier, Exclure, Supprimer, avec confirmation de suppression. Lien secondaire cohérent depuis /methodologie sans modifier artificiellement la navigation primaire. Famille Apprendre et composants CMM ; états loading/erreur/vide, responsive, clavier et modes d'affichage.
- Documenter contrat personnel, entrée locale, provenance, confidentialité, données manquantes, stockage, droits, durée/suppression et fiche CURRENT de la page uniquement lorsque le runtime correspondant existe ; mettre à jour SCIENTIFIC_PROTOCOL si les contrats visibles changent.

VALIDATION
Tests du domaine et de la sérialisation, entrée partielle, cohérence des catégories fournisseur, gratuit/abonnement, messages sans tokens, local/cloud, null/zero, code HTTP public/authentifié, CRUD et isolation comptes A/B, id falsifié et accès après suppression. Preuve RLS exécutée en CI PostgreSQL éphémère, en distinguant STATIC_CONTRACT et INTEGRATION_PROOF. Tests navigateur de bout en bout du calcul anonyme et du cycle sauvegarder/corriger/supprimer ; typecheck, lint, couverture Web ciblée et gouvernance documentaire. Vérifier les consommateurs Mobile du contrat sans dupliquer l'UI mobile.

STOP CONDITION
Un utilisateur anonyme peut déclarer une activité IA sans tokens, comprendre ses limites et explorer un scénario explicite sans fausse précision ; un utilisateur connecté peut sauvegarder et gérer uniquement ses relevés, et ni les inconnues ni les données privées ne contaminent les métriques du projet. L'absence de preuve PostgreSQL/E2E interdit de qualifier la persistance de complètement validée.
```
