# Profil détaillé - Présentation détaillée

## Rôle
Surface du profil actif : progression, badges, actions prioritaires, parrainage,
réglages et changement de profil lorsque l’accès l’autorise.

## Parcours
- Le compte arrive sur `/profil/[profile]` avec un profil accepté par
  `isAppProfile`.
- Le bloc « Progression & badges » présente les métriques personnelles et
  fournit le CTA secondaire « Voir ma carte d’impact » vers `/profil/impact`.
- La carte d’impact personnelle reste une surface dédiée ; les rapports
  collectifs restent dans `/reports`.

## Points à clarifier
- La route dynamique ne doit pas traiter `impact` comme un profil valide : la
  route statique `/profil/impact` porte seule cette surface.
