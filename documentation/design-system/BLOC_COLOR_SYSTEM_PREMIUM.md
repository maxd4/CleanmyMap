# BLOC_COLOR_SYSTEM_PREMIUM : système de couleurs par bloc

**Statut : CURRENT (socle I1 et adoption I2 intégrés).** Les preuves navigateur multi-largeurs et la régénération du board design-system complètent la clôture I3.

Sources de vérité : registre `page-families` (résolution des routes),
`surface-palette.ts` (valeurs chromatiques), `surfaces.css` et `actions.css`
(consommation). Les règles de dimensions et de typographie restent dans
[PAGE_HEADER.md](./PAGE_HEADER.md) et [LAYOUT_SPACING.md](./LAYOUT_SPACING.md).
Les valeurs hexadécimales ci-dessous sont la lecture documentaire du registre
runtime ; ne pas créer un second registre de palettes.

## Principe général

Le fond des pages Web classiques est blanc opaque en thème clair et sombre
opaque en thème sombre. Les anciennes nappes, halos et gradients colorés du
canvas ne sont plus utilisés sur ces pages. La couleur de famille identifie
les encadrés, cartes thématiques, titres, sélections et onglets, non la totalité
du fond. Les surfaces neutres (formulaires, tables, textes longs, données et
cartes géographiques) restent lisibles, sans coloration décorative forcée.
La couleur du contenu métier (légendes, indicateurs, erreurs, statuts, séries)
ne change jamais simplement parce que la route change de famille.

Les grands encadrés thématiques peuvent utiliser un dégradé opaque primaire
vers profond, avec texte blanc exact ; les cartes courantes de famille
utilisent un dégradé clair soft vers tint, avec texte sémantique sombre.
Le mode exhaustif autorise une profondeur mesurée, sans glassmorphism
qui mélange un fond imprévisible au texte. Un accent cuivre, doré, violet ou
turquoise est un détail, pas une couleur de petit texte par défaut. Le thème
sombre utilise la surface dark de la palette, sans blanchir les préférences de
l'utilisateur. Voir [SURFACES_CARDS.md](./SURFACES_CARDS.md).

## Palette des cinq blocs et familles autonomes

| Identité | Primaire | Profond | Soft | Tint | Accent décoratif | Dark |
| --- | --- | --- | --- | --- | --- | --- |
| Accueil & Pilotage | #9A3412 | #431407 | #FFF1E6 | #FED7AA | #B88736 | #382016 |
| Agir | #047857 | #115E59 | #ECFDF5 | #D1FAE5 | #0E7490 | #102D29 |
| Cartographie | #075985 | #1E3A8A | #F0F9FF | #DBEAFE | #0E7490 | #142843 |
| Impact & Rapports | #9F1239 | #701A75 | #FFF1F2 | #FFE4E6 | #B45309 | #371D2D |
| Réseau & Discussions | #9D174D | #581C87 | #FCE7F3 | #F9D5E9 | #B88628 | #321B31 |
| Apprendre | #92400E | #713F12 | #FFFBEB | #FEF3C7 | #0F766E | #35291C |
| Auth & Onboarding | #4338CA | #312E81 | #EEF2FF | #E0E7FF | #B88628 | #222342 |
| Institutionnel & Légal | #334155 | #1E293B | #F8FAFC | #E2E8F0 | #475569 | #1E293B |
| Système & Utilitaires | #155E75 | #334155 | #F0F9FF | #E0F2FE | #0369A1 | #1E293B |
| Administration | #1E3A5F | #172033 | #F1F5F9 | #DCE6F0 | #B88736 | #182436 |

Les associations blanc sur primaire/profond, #0F172A sur soft/tint, primaire
sur soft/tint/blanc, #F8FAFC sur dark ont un contraste calculé au moins 4,5:1.
Ce contrôle des couleurs opaques ne remplace pas les mesures du rendu
réel (transparences, gradients, texte secondaire, états et contrôles).
WCAG AA : texte courant 4,5:1, grand texte et éléments non textuels pertinents
3:1. L'accent décoratif seul n'est ni un indicateur d'état ni une couleur de
texte garantie. Les textes secondaires ne doivent pas être atténués par
une opacité arbitraire.

## Correspondances et exceptions

Le registre `resolvePageFamily` reste l'unique propriétaire de la résolution
par route ; `resolvePageSurfacePalette` dérive le preset depuis la tonalité
existante. Les exceptions sont documentées dans [UI_EXCEPTION_PAGES.md](./UI_EXCEPTION_PAGES.md).
Les cinq blocs conservent leur identité dans le ruban, sans recolorer les
assets de marque. Le bloc 03 conserve deux variantes, cartographie bleue et
impact grenat (dont rapports, gamification et méthodologie). Le bloc 04
partage le rose profond et le violet pour annuaire, messagerie, partenaires,
open data, financement et discussions ; les nuances violettes peuvent
distinguer les sous-surfaces. Accueil/pilotage cuivre et Agir vert gardent
leur rattachement. Apprendre est ocre/miel ; les couleurs propres aux
illustrations scientifiques restent libres selon leur sens.

Exceptions de canvas : homepage `/` et alias `/accueil`, sommaire
`/explorer` (palette et composition autonomes conservées), connexion et
inscription (composition dédiée Clerk, continuité emerald documentée et CTA
critical), impression/export (surface documentaire). L'onboarding courant
utilise la famille indigo ; les états techniques conservent leurs couleurs
sémantiques. Les pages inconnues gardent le secours neutre : pas de
reclassification de produit implicite. Les pages et composants immersifs
peuvent conserver leur surface spécialisée documentée, non une exception
générale de famille.

## Hiérarchie canonique des boutons

La couleur d'un bouton exprime l'importance de l'action, jamais la famille
fonctionnelle de la page. La hiérarchie unique, du niveau le plus élevé au
niveau le plus faible, est la suivante :

| Niveau | Couleur | Usage canonique |
| --- | --- | --- |
| 1 | Doré / brun | Action critique ou très importante, structurante ou décisive pour le parcours. Usage rare et intentionnel ; par exemple, connexion ou inscription lorsqu'elle constitue le passage nécessaire vers l'usage complet du produit. |
| 2 | Violet | Action importante que l'on souhaite distinguer nettement sans lui donner le poids maximal. Peut cohabiter avec un bouton vert ou blanc. |
| 3 | Vert | Action standard et majoritaire. C'est le choix par défaut pour les CTA et actions positives ordinaires lorsqu'aucune priorité exceptionnelle ne justifie le doré/brun ou le violet. |
| 4 | Blanc | Action d'accompagnement, alternative ou complémentaire. Le blanc ne doit pas concurrencer visuellement le CTA principal. |

Cette hiérarchie est indépendante de la palette de la page ou de la famille du
bloc. Une zone d'actions doit rendre sa priorité immédiatement compréhensible
et éviter plusieurs actions de niveau maximal côte à côte sans justification.
Le blanc est normalement un compagnon, pas le CTA dominant.

### Contrat runtime actuel

`CmmButton` expose les identifiants runtime
`tone="primary" | "secondary" | "tertiary" | "important" | "critical" | "destructive"`.

- `primary` est le bouton vert publié pour l'action standard/majoritaire ;
- `secondary` est le bouton blanc publié pour l'action d'accompagnement et
  constitue la valeur par défaut actuelle ;
- `tertiary` est une action transparente de faible emphase ou contextuelle ;
- `important` est le bouton violet publié pour une action importante, au-dessus
  du vert sans atteindre le niveau critique doré/brun ;
- `critical` est le bouton doré/brun publié pour une action critique ou très
  importante, structurante ou décisive pour le parcours ;
- `destructive` conserve son traitement rouge de danger et ne fait pas partie
  de la hiérarchie de priorité `doré/brun > violet > vert > blanc`.

Le doré/brun est publié sous l'identifiant sémantique `critical`, et non sous
un nom de couleur comme `gold` ou `brown`. Le violet est publié sous
`important`, pour la même raison.

Les états hover, focus, loading, disabled et les exigences d'accessibilité
restent obligatoires pour les quatre niveaux. L'importance métier ne doit pas
être confondue avec le caractère destructif d'une action.

### Exemple de composition homepage

La composition de référence applique la hiérarchie ainsi :

- **Consulter la carte** → vert ;
- **Discuter** → violet ;
- **Créer une action** → blanc ;
- **Rejoindre une action** → blanc ;
- **Se connecter / S'inscrire** → doré/brun.

Cet exemple décrit le contrat de priorité visuelle. Utiliser `tone="critical"`
pour le doré/brun et `tone="important"` pour le violet.

## En-têtes, surfaces et navigation

- Utiliser `PageHeader` ; aucune variation de typographie ni de géométrie
  par famille. `family` choisit la couleur de titre, `tone` et `contrast`
  restent pour les surfaces autonomes explicites. Sous-titre neutre lisible.
  Position `left` ou `center` selon le contrat de la route.
- `CmmCard` reste neutre par défaut. Le tone `family` sélectionne le
  fond thématique pour les variantes default/elevated ; les tons sémantiques
  explicites et variantes muted/outlined/glass gardent leur contrat.
- `FamilyRubriqueCard` utilise le grand encadré thématique de sa famille
  si le contexte de route correspond. `RubriqueCard` spécialisé peut porter
  une surface distincte selon son rôle ; converger les overrides inutiles
  vers les primitives sans changer le contenu.
- La présentation de tablist et de ses boutons est partagée par les
  formulaires et les vues locales via `cmm-tab-strip.styles.ts`. Un onglet
  actif est un état de navigation dans la palette de famille, pas un CTA
  classé dans la hiérarchie des actions. Préserver ARIA, focus et clavier.
- Exhaustif : dégradés opaques, accents et ombres modérés. Minimaliste :
  teintes unies sans ombre décorative. Sobre : surfaces neutres plates,
  sélection identifiable, aucun gradient décoratif. Aucun mode ne change
  les fonctionnalités. Les préférences de mouvement restent prioritaires.
- Ne pas forcer une couleur de famille sur les alertes, axes, graphiques,
  statuts, cartes géographiques, badges métier ou boutons d'action. Les
  repères doivent aussi être textuels ou géométriques.
- Garde de surface, tests de famille et mesures navigateur obligatoires
  selon le lot. Mettre à jour le board généré via son générateur existant,
  sans édition manuelle des artefacts. Conserver les exceptions et les
  règles de marque, ne pas dupliquer la matrice UI/UX gelée.

Les anciens fonds colorés sont historiques pour les pages classiques ;
ils restent utiles uniquement aux compositions explicitement conservées.
