# Organisations entreprise — CURRENT

## Parcours disponible

`/sponsor-portal?tab=organization` donne accès aux ressources d'une organisation lorsque la session Clerk possède une adhésion active. Le rôle actif `entreprise` ne crée ni adhésion ni autorisation. Les routes `/api/organizations` et `/api/reports/organization` résolvent l'acteur depuis la session; les scopes et opérations sont contrôlés côté serveur. Le bootstrap `/api/admin/organizations/bootstrap` est réservé à l'administration et exige une demande acceptée ainsi que la correspondance vérifiée de l'organisateur.

Le workspace permet de consulter les adhésions et invitations, accepter/refuser une invitation, inviter par identifiant de compte, révoquer une adhésion, transférer la responsabilité à un gestionnaire actif, créer/modifier/archiver un établissement, rattacher une action admissible déjà existante et créer/faire progresser une campagne. Les campagnes associent des actions existantes; elles ne copient pas les actions. Le gestionnaire de site est limité à son site par les fonctions d'accès serveur.

Le bilan privé accepte une période et un scope organisation, établissement ou campagne. Il retourne des agrégats avec couverture et un CSV limité aux champs autorisés. La génération est plafonnée à 500 actions et refuse un scope trop large; le parcours demande alors une période plus courte. La projection n'expose ni identité, note, photo, coordonnées ni localisation précise. Les participations déclarées sont une somme et ne représentent pas des personnes uniques.

## Limites et preuves

- La vérification humaine du mandat avant bootstrap n'a pas d'interface dédiée; l'API admin ne remplace pas cette étape.
- L'invitation exige un identifiant de compte Clerk; il n'y a pas encore de recherche de compte ergonomique.
- La correction ou le détachement audité d'une action, l'annulation d'une association campagne-action, l'historique des rapports et le PDF privé ne sont pas disponibles.
- Les graphes, calendriers, performances avancées et kit de communication factuel restent à planifier selon leurs owners existants.
- La migration a été appliquée dans la lane Supabase éphémère CI. La suite pgTAP passe `33/33` : tables/RLS, absence de droits navigateur, grants service-only, bootstrap, propriétaire issu du compte déposant, refus de lecture Beta par le propriétaire Alpha, invitation/acceptation et transfert atomique owner→manager. La preuve est liée au candidat `0068fed5481551b54eddec0c2f445826129edf3c` ([run SQL CI](https://github.com/maxd4/CleanmyMap/actions/runs/46045736761)). La base Supabase liée n'a pas été modifiée; son préflight antérieur ne fournissait pas le schéma de preuve courant.
- Les tests Vitest couvrent les contrats API, l'agrégation, les refus de scope et les liens. Le contrôle navigateur local emploie des réponses API synthétiques et ne prouve pas l'intégration navigateur→Supabase. La lane SQL n'ajoute pas de test de concurrence dédié aux mutations d'organisation; le verrouillage et l'atomicité sont définis par les RPC et doivent être couverts par un scénario de concurrence dédié avant usage intensif.

Les challenges restent `PLAN` : ils ne sont pas activés tant qu'un besoin distinct des campagnes et une décision produit ne sont pas établis. Le modèle économique, une certification ESG et un reporting CSRD automatique ne sont pas inclus.
