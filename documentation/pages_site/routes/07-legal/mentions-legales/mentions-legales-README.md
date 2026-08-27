# Mentions légales

## Fiche canonique

- **Route** : `/mentions-legales`
- **Fichier(s) source(s)** :
- `apps/web/src/app/mentions-legales/page.tsx`
- **Type fonctionnel** : légale
- **Famille / bloc fonctionnel** : Institutionnel & Légal (hors bloc)
- **Statut** : légal
- **Contexte nécessaire** : Aucun, page institutionnelle
- **Objectif utilisateur principal** : Informer sur les règles, les droits et la conformité, sans esthétique marketing.
- **Action principale attendue** : Lire un document ou contacter l'équipe.
- **Palette attendue** : slate / gris clair
- **Scope** : LEGAL-02 — gate factuel bloqué
- **Terminée** : non
- **Couleurs actuellement détectées** : legal — canvas #f8fafc, halo rgba(148, 163, 184, 0.18)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : faible : la palette doit rester slate / gris clair / blanc, sans gradients visibles ni effets marketing.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Titres légaux
- sections obligatoires
- liens de contact
- mentions réglementaires
- structures de lecture
- ancres utiles
- **Textes à réduire ou supprimer** :
- Décorations inutiles
- phrases promotionnelles
- blocs redondants
- callouts d'ambiance
- **Bulles / cartes / contextes trop nombreux** : Le contenu réglementaire doit rester sobre, compact et cohérent d'une page à l'autre.
- **Composants UI concernés** :
- LegalSection
- LegalLayout
- Article
- listes
- footer
- liens
- tableaux légaux
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Gate factuel LEGAL-02

La page ne doit pas être déclarée conforme ni complétée avec un placeholder
tant qu'une information opérateur explicite n'a pas déterminé si l'éditeur est
une personne physique non professionnelle, une personne physique
professionnelle ou une personne morale.

Les sources du projet confirment uniquement l'initiative et la conception de
CleanMyMap par Maxence Deroome. Elles ne confirment pas son rôle d'éditeur légal
ou de directeur de publication. Il manque également l'identité juridique et
les coordonnées de l'éditeur selon le régime retenu, ainsi que le téléphone
général de l'hébergeur Vercel. Le diagnostic détaillé et les sources vérifiées
sont centralisés dans [`documentation/legal/README.md`](../../../../legal/README.md).
