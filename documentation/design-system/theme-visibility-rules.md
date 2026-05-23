# Règles Strictes de Visibilité - Fond Clair / Fond Contrasté

## Objectif
Garantir une interface lisible en permanence, sans texte invisible, sans bouton ambigu, et avec des contrastes vérifiables dans tous les états UI.

## 1) Contraste minimum obligatoire
- Texte principal: ratio >= 7:1 sur son fond.
- Texte secondaire: ratio >= 4.5:1.
- Icônes informatives: ratio >= 3:1.
- Bordures de composants interactifs: ratio >= 3:1 contre le fond adjacent.
- États `hover`, `active`, `focus`, `disabled`: conservent un contraste conforme.
- Les surfaces qui portent du texte doivent rester plus foncées que le background global quand le site repose majoritairement sur du texte blanc, afin de renforcer la lisibilité et de faire ressortir les contenus inversés.

## 1 bis) Limite de blanc sur les backgrounds
- Sur un background de page teinté, la couche la plus lumineuse ne doit jamais dépasser un mix blanc de `34%` sur une base colorée.
- Au-delà d’environ `40%` de blanc perçu, la teinte se lave et le fond lit comme un blanc cassé au lieu d’une vraie couleur.
- Si une page doit paraître plus claire, il faut baisser la saturation ou changer la teinte de base, pas augmenter la part de blanc.
- Valeur critique à retenir: `rgba(255,255,255,0.34)` max pour la couche lumineuse principale d’un fond coloré.
- Règle pratique: une page = une teinte dominante, un même système de glows et de contrastes, puis seulement la couleur change selon la route.
- Exception validée: le Sommaire (`/explorer`) conserve sa palette actuelle tant qu'il reste la référence UX la plus aboutie.

## 2) Tokens de couleurs obligatoires
- Interdire les couleurs codées en dur dans les composants critiques (CTA, navigation, badges, tableaux KPI).
- Utiliser des variables sémantiques:
  - `--bg-primary`, `--bg-elevated`, `--bg-muted`
  - `--text-primary`, `--text-secondary`, `--text-inverse`
  - `--border-default`, `--border-strong`
  - `--action-primary-bg`, `--action-primary-text`, `--action-primary-hover`
  - `--focus-ring`
- Chaque token doit avoir une valeur claire et une valeur sombre.
- Sur les cartes et bulles à fond sombre, utiliser les utilitaires canoniques:
  - `cmm-text-card-label` pour les petits textes et meta, blancs par défaut
  - `cmm-text-card-copy` pour les descriptions courtes, blancs avec une opacité lisible
  - `cmm-text-card-title` pour les titres et sous-titres, en couleur d'accent
  - `cmm-text-card-value` pour les chiffres, en couleur d'accent avec chiffres tabulaires

## 3) Boutons et liens (règle anti-invisibilité)
- Un CTA doit toujours respecter:
  - fond plein visible,
  - texte avec contraste élevé,
  - bordure explicite si le fond est proche du fond parent,
  - focus ring visible clavier.
- Les liens texte seuls doivent être soulignés au `hover` et au `focus`.
- Interdit: texte clair sur fond clair ou texte sombre sur fond sombre même temporairement au `hover`.

## 4) Cartes KPI et blocs de données
- Les cartes KPI doivent partager:
  - la même hauteur minimale,
  - la même densité d’information,
  - le même niveau de contraste titre/valeur.
- Les grilles KPI desktop doivent éviter les lignes orphelines (ex: 5 + 1). Préférer des grilles stables (2x3, 3xN, 4xN selon le nombre d’items).
- Les unités (kg, L, €) restent visuellement séparées de la valeur sans réduire la lisibilité.
- Dans les cartes sombres et bulles, les petits textes restent blancs par défaut.
- Les titres, sous-titres et chiffres doivent être accentués, jamais neutralisés en gris faible contraste.
- Les cartes denses évitent les doublons visuels: un seul niveau de titre, un seul niveau de sous-texte, pas de surcharge typographique.

## 5) Navigation, badges, ruban
- Le ruban ne doit jamais superposer du texte sur un fond non contrasté.
- Les badges de rôle/profil gardent un contraste >= 4.5:1.
- Les infobulles utilisent un fond opaque (pas translucide faible contraste).

## 6) États d’erreur, succès, info
- Message d’état + icône + couleur + texte explicite.
- Ne jamais transmettre une information critique uniquement par la couleur.
- Tous les états doivent rester lisibles en clair et sombre.

## 7) Règles de QA avant merge
- Vérifier manuellement au minimum:
  - page d’accueil,
  - navigation/ruban,
  - principal CTA,
  - cartes KPI,
  - page méthodologie.
- Vérifier explicitement:
  - la homepage,
  - la page sommaire,
  - les cartes et bulles à fond sombre,
  - les petits textes en blanc,
  - les chiffres et titres/subtitres en couleur.
- Vérifier en version claire et en version contrastée:
  - repos, hover, focus clavier, disabled.
- Bloquer la release si un composant interactif devient illisible dans une des deux variantes.

## 8) Interdictions
- Pas de texte avec opacité < 70% pour des actions importantes.
- Pas de bouton sans style `focus-visible`.
- Pas d’effet visuel (blur, glass, gradient) qui dégrade la lecture du texte.
- Pas d’utilisation de gris proches pour texte et fond.

## 9) Checklist rapide (obligatoire)
- Texte principal lisible partout.
- CTA principal lisible partout.
- Bouton Méthodologie lisible en clair/sombre.
- Aucun bloc KPI orphelin sur desktop.
- Focus clavier visible sur tous les contrôles.
