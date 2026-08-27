# CGU

## Fiche canonique

- **Route** : `/conditions-generales-utilisation`
- **Fichier(s) source(s)** :
- `apps/web/src/app/conditions-generales-utilisation/page.tsx`
- **Type fonctionnel** : légale
- **Famille / bloc fonctionnel** : Institutionnel & Légal (hors bloc)
- **Statut** : légal
- **Contexte nécessaire** : Aucun, page institutionnelle
- **Objectif utilisateur principal** : Informer sur les règles, les droits et la conformité, sans esthétique marketing.
- **Action principale attendue** : Lire un document ou contacter l'équipe.
- **Palette attendue** : slate / gris clair
- **Scope** : CGU alignées sur le produit réel, les contributions utilisateurs et les dispositifs DSA-01/02 de notification électronique et de décision tracée
- **Terminée** : oui
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
- **Priorité de correction** : terminée

## Références legacy

- Aucun fichier legacy dédié.

## Comportement fonctionnel vérifié

- La modération peut traiter un contenu contraire aux règles, à un besoin légal ou à la sécurité du service.
- Le formulaire `/signaler-contenu-illicite` permet de transmettre une notification électronique avec URL exacte et motif circonstancié.
- Le dispositif ne demande pas au déclarant de qualifier juridiquement parfaitement les faits et ne présente pas CleanMyMap comme un fournisseur d'hébergement au sens du DSA.
- Les CGU distinguent une action créée par un utilisateur ou un organisateur tiers d'une action éventuellement organisée par CleanMyMap ; aucune assurance, matériel ou encadrement n'est promis par défaut.
- Les contributions restent la propriété de leurs auteurs et font seulement l'objet d'une licence technique non exclusive nécessaire au service.
- Les liens vers la confidentialité, les cookies, le contact et le signalement de contenu illicite sont accessibles depuis la page.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- Cette fiche et la page publique ont été réconciliées le 27 août 2026 dans le cadre de LEGAL-04.
