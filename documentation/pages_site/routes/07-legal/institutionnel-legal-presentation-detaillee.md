# Institutionnel & Légal - Présentation détaillée

## Fiche canonique

- **Bloc** : Institutionnel & Légal
- **Dossier canonique** : `07-legal`
- **Rôle** : regrouper les pages juridiques, institutionnelles et de conformité.
- **Sous-rubriques** : CGU, conditions d'utilisation, contact, English entry, mentions légales, politique de confidentialité, politique cookies.
- **Snapshots** : colocalisés dans le dossier de chaque page canonique.

## Parcours juridique CURRENT

Le contenu des conditions, des mentions légales et des politiques appartient aux pages canoniques accessibles depuis [le README du bloc](./institutionnel-legal-README.md). Le bloc n'introduit ni capture de consentement concurrente ni modèle juridique parallèle.

- `/conditions-generales-utilisation` et `/mentions-legales` : lecture des conditions et informations de l'éditeur ;
- `/politique-confidentialite` et `/politique-cookies` : informations sur les traitements et choix de suivi ;
- `/contact` et `/signaler-contenu-illicite` : points d'entrée publics ayant leurs propres contrats d'envoi.

Le libellé ou l'état d'une bannière ne constitue pas une preuve juridique : vérifier les composants de consentement, l'arrêt des traceurs, les textes légaux et les tests applicables avant de modifier le parcours.

## Règle commune de consentement vérifiée

Les pages juridiques renvoient vers un dispositif commun : deux choix explicites (**Tout accepter** / **Tout refuser**) sont proposés au premier niveau et conservés pendant 6 mois. Le footer expose en permanence **Gérer mes cookies** pour rouvrir la bannière. L'expiration d'une décision locale nettoie l'état et repropose le choix ; le retrait coupe les services analytiques conditionnels et arrête une instance PostHog déjà initialisée.
