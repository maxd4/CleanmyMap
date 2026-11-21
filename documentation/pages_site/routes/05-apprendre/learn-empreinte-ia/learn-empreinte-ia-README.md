# Mon empreinte IA

## Fiche canonique

- **Route** : `/learn/empreinte-ia`
- **Accès** : public pour le calcul anonyme; fonctionnalités de sauvegarde et de gestion authentifiées et owner-scoped.
- **Fichier source** : `apps/web/src/app/learn/empreinte-ia/page.tsx`
- **Client de saisie et gestion** : `apps/web/src/app/learn/empreinte-ia/personal-ai-declaration-client.tsx`
- **Owner scientifique et normalisation** : `apps/web/src/lib/environmental-impact-estimator/`
- **Persistance** : `public.personal_ai_declarations`, RLS Clerk et `/api/personal-ai/declarations`.
- **Famille visuelle** : Apprendre; accents d'impact repris du composant pédagogique.

## Parcours

- La saisie peut rester anonyme. Elle n'appelle aucune API de sauvegarde.
- La connexion rend disponible l'enregistrement explicite et la liste privée du compte.
- Une personne peut corriger une déclaration, l'exclure, la réactiver ou la supprimer définitivement.
- Les bornes de période sont des dates UTC, avec borne de fin exclusive.
- Une entrée vide reste inconnue (`null`); zéro est un choix explicite.
- Les frontières énergétiques IT, site et mur local restent distinctes; sans frontière ou preuve, le moteur ne revendique pas une mesure correspondante.
- EcoLogits ne traite que les données qualifiées par requête. Les agrégats restent proxy ou `NA`.
- Le moteur fournit les valeurs, les versions scientifiques, les sources et les limites; les inconnues restent `NA`.

## Données et confidentialité

La persistance minimale associe l'identifiant Clerk propriétaire à une déclaration normalisée et au snapshot scientifique calculé côté serveur. Sont enregistrés les choix de source/provenance, le fournisseur, les modèles/opérateurs déclarés, la région physique déclarée, la granularité, la période, les catégories de tokens, les modalités, les frontières énergétiques et les versions de méthode/facteurs.

Les prompts, conversations, factures, identifiants bruts de compte fournisseur, clés d'API et credentials ne font pas partie du contrat. Les tableaux, projections et comparaisons de cette page ne modifient pas les KPI terrain, les règles XP, la gamification ni les snapshots environnementaux du projet. Les scénarios de collecte restent pédagogiques et ne constituent aucune compensation carbone ou hydrique.

RLS limite les lignes à `auth.jwt()->>'sub'`; les routes répètent ce contrôle par identifiant et owner. Les réponses privées utilisent `Cache-Control: private, no-store`. Les données sont conservées jusqu'à leur suppression par la personne ou au traitement d'une demande de droits; aucune purge automatique n'est configurée.

La fiche de méthode globale est [SCIENTIFIC_PROTOCOL.md](../../../../product/SCIENTIFIC_PROTOCOL.md). La déclaration et ses snapshots sont versionnés et ne créent pas d'historique avancé ou de budget du lot 3.
