# Documentation juridique

Ce dossier est la source documentaire juridique canonique de CleanMyMap. Il
décrit le produit et les traitements tels qu'ils sont établis par le code, la
configuration et les informations opérateur disponibles. Les pages publiques
du site reprennent ces doctrines dans un format destiné aux utilisateurs.

## Cadre juridique actuel

CleanMyMap est un projet étudiant édité par Maxence Deroome, personne physique éditant à titre non professionnel.

- **Éditeur** : Maxence Deroome, personne physique ;
- **Directeur de la publication** : Maxence Deroome ;
- **Hébergeur web** : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA
  91723, United States.

Aucune société, entreprise, association ou autre personne morale n'exploite
actuellement CleanMyMap. L'éditeur n'expose pas publiquement son domicile ni
son téléphone personnel.

L'hébergeur du site est distingué des prestataires techniques : Supabase pour
la base de données et le stockage, Clerk pour l'identité et l'authentification,
Resend pour l'envoi d'emails, PostHog pour les analytics soumis au consentement
et Sentry pour l'observabilité et la sécurité lorsqu'il est configuré. Ces
services ne sont pas présentés comme l'hébergeur du site.

## Documents spécialisés

| Document | Rôle | Page publique |
| --- | --- | --- |
| [Conditions générales d'utilisation](conditions-generales-utilisation.md) | Accès, usages, contenus, actions et modération | [CGU](https://cleanmymap.fr/conditions-generales-utilisation) |
| [Politique de confidentialité](politique-confidentialite.md) | Données personnelles, finalités, bases légales, conservation et droits | [Confidentialité](https://cleanmymap.fr/politique-confidentialite) |
| [Politique des cookies](politique-cookies.md) | Consentement, cookies, analytics et préférences | [Politique cookies](https://cleanmymap.fr/politique-cookies) |
| [Charte de sécurité et de comportement](charte-benevole.md) | Bonnes pratiques de sécurité et participation terrain | — |
| [Notification et modération](dsa-signalement-moderation.md) | Signalement de contenu et décision administrative | [Signaler un contenu](https://cleanmymap.fr/signaler-contenu-illicite) |

Les mentions légales, qui présentent l'éditeur, le directeur de la publication,
l'hébergeur et les prestataires, sont publiées sur la page
[Mentions légales](https://cleanmymap.fr/mentions-legales).

## Point de contact

Le point de contact juridique et RGPD actuellement configuré est
<contact@cleanmymap.fr>. Il peut être utilisé pour les questions juridiques,
l'exercice des droits et les demandes concernant le service.

## Politique de licence

### Code source

Le code du monorepo destiné au produit CleanMyMap est distribué sous la
[GNU Affero General Public License v3.0](../../LICENSE), SPDX
AGPL-3.0-only. Cela couvre l'application web, l'API, l'application mobile,
les scripts et le code technique propres à CleanMyMap. La licence autorise
l'utilisation, l'étude, la modification et la redistribution, y compris
commerciales, sous réserve de ses conditions, notamment celles applicables aux
versions modifiées proposées via un réseau.

Le texte officiel complet est le fichier [LICENSE](../../LICENSE). Les
licences des dépendances restent celles qui leur sont propres et ne sont pas
modifiées par cette politique.

### Frontières de licence

- **Données ouvertes CleanMyMap** : la base de données n'est pas déclarée
  ouverte dans son ensemble. Une donnée ou un jeu de données n'est open data
  que lorsqu'il est explicitement publié comme tel. Pour un jeu de données
  CleanMyMap effectivement destiné à l'open data, une licence est définie
  dataset par dataset, avec une préférence pour la Licence Ouverte Etalab 2.0
  lorsqu'elle est juridiquement pertinente. Cette licence n'est pas appliquée
  automatiquement aux données non publiées.
- **Données tierces** : leur licence et leurs conditions d'origine sont
  conservées et affichées lorsqu'elles sont disponibles. Elles ne sont pas
  relicenciées sous AGPL, CC BY-SA ou une licence ouverte CleanMyMap. Cela
  inclut notamment OpenStreetMap sous ODbL et les données publiques sous
  Licence Ouverte.
- **Données personnelles** : elles ne sont soumises à aucune licence ouverte.
  Elles restent régies par le RGPD, les CGU et la politique de confidentialité.
  L'AGPL du code ne rend pas publics les comptes, emails, données
  personnelles, photos privées, données non publiées ou contenus soumis à des
  droits tiers.
- **Contenus pédagogiques et éditoriaux originaux** : la cible est CC BY-SA
  4.0 pour les contenus originaux CleanMyMap dont les droits et le périmètre
  réutilisable sont établis. Aucun corpus ambigu contenant des œuvres tierces,
  logos, photos, contenus utilisateurs ou droits non établis n'est déclaré
  sous CC BY-SA par défaut. Tant qu'un périmètre propre n'est pas démontré,
  cette licence reste une cible et non une licence générale du corpus.
- **Documentation technique** : lorsqu'elle fait partie intégrante du dépôt
  logiciel, elle peut relever de l'AGPL-3.0-only. Cette règle ne crée pas une
  seconde doctrine documentaire concurrente.
- **Nom et identité visuelle** : le nom CleanMyMap, le logo et l'identité
  visuelle CleanMyMap restent réservés. L'AGPL du logiciel ne donne pas le
  droit d'utiliser la marque de façon à présenter un fork ou un service tiers
  comme la version officielle de CleanMyMap. Aucune affirmation de marque
  enregistrée n'est faite ici.

## Maintenance documentaire

La règle de cohérence est la suivante :

1. le code et le runtime établissent les capacités réellement disponibles ;
2. les documents spécialisés décrivent ces capacités et les règles juridiques
   applicables ;
3. ce README sert d'index et de synthèse, sans dupliquer les développements
   des documents spécialisés.

Toute évolution d'un traitement, d'un fournisseur, d'une capacité ou d'une
information juridique doit être répercutée dans le document spécialisé
concerné, puis dans cet index si nécessaire.
