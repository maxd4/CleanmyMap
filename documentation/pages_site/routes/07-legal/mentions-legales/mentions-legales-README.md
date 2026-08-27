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
- **Scope** : LEGAL-02 — régime de personne physique éditant à titre non professionnel
- **Terminée** : oui, sous réserve de la condition d'anonymat Vercel non vérifiable localement
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

## Statut juridique LEGAL-02

La confirmation opérateur établit que CleanMyMap est actuellement édité par
Maxence Deroome, personne physique éditant à titre non professionnel dans le
cadre d'un projet étudiant. Aucune société, entreprise, association ou autre
personne morale n'exploite actuellement le service. Maxence Deroome est le
directeur de la publication conformément à l'article 93-2 de la loi du
29 juillet 1982.

La page sépare explicitement l'édition et la publication, l'hébergement par
Vercel Inc. et les services techniques fournis par Supabase, Clerk, Resend,
PostHog et Sentry. Ces derniers ne sont pas présentés comme l'hébergeur du site.

La page ne publie ni domicile ni téléphone personnels : la condition d'anonymat
de l'article 1-1 II de la LCEN, qui suppose la communication préalable à Vercel
des éléments personnels nécessaires à l'identification, n'est pas vérifiable
dans les données de compte accessibles depuis ce checkout. Aucun téléphone
général de Vercel ni numéro réservé aux notifications DMCA n'est repris.
Le diagnostic et les sources sont centralisés dans
[documentation/legal/README.md](../../../../legal/README.md).
