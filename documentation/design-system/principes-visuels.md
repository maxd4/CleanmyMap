# Principes visuels

- Sobriete, lisibilite, priorite a l'utilite terrain.
- Eviter les patterns addictifs ou competitifs excessifs.
- Mettre en avant impact reel, qualite et collectif.
- Sur les surfaces metier denses, privilegier tableaux, KPI, filtres et structures stables plutot que des compositions marketing.
- Chaque bloc a un fond de page clair/lumineux dans sa teinte, et des cartes sombres teintées pour ressortir dessus. Référence : page sommaire `/` et `accueil-pillars.tsx`.
- Les titres, chiffres et sous-titres sont colorés dans l'accent du bloc. Les textes sont blancs à 100% par défaut (`text-white`). Opacité réduite uniquement en exception justifiée (placeholder, état désactivé, hiérarchie secondaire explicite).
- Les backgrounds de page doivent garder une teinte lisible: ne jamais dépasser un mix blanc de 34% sur la couche lumineuse d'un fond coloré, sinon la couleur disparaît.
- Si une page doit sembler plus claire, changer la teinte de base ou baisser la saturation, pas la quantité de blanc.
- Supprimer les bulles, labels ou phrases de contexte trop explicites quand ils n'apportent pas une décision ou une action réelle. Préférer une hiérarchie visuelle nette avec moins de textes secondaires.
- Familles de pages:
  - Accueil et ses variantes doivent rester dans une teinte jaune soleil / amber, chaleureuse mais pas blanchie.
  - Pilotage et ses variantes doivent rester dans une teinte brun / brun-orangé, plus dense et institutionnelle.
  - La page Sommaire (`/explorer`) reste l'exception validée et ne suit pas cette recoloration.
- Les formulaires doivent fournir un feedback explicite, local et accessible en cas d'erreur ou de chargement.
- Les interactions critiques doivent rester utilisables au clavier et sur mobile, avec des cibles tactiles suffisantes.
- Eviter tout layout shift sur cartes, panneaux, maps, analytics et modules asynchrones.
