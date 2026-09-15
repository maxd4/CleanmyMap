# Historique des actions - Liste des propositions à traiter

Une proposition future est conservée ci-dessous ; elle n'est pas disponible dans le runtime actuel.

## Proposition future — Préconfiguration d'un rapport d'impact

Lorsqu'une action est réellement validée, son interface pourra proposer le
bouton « Générer un rapport d'impact ». Ce bouton ne génère pas directement un
PDF : il ouvre `/reports` avec une configuration initiale préparée pour cette
action validée uniquement.

Le parcours cible est :

```txt
action validée
      ↓
« Générer un rapport d'impact »
      ↓
/reports
      ↓
configuration préremplie
      ↓
périmètre = cette action uniquement
      ↓
vérification éventuelle par l'utilisateur
      ↓
génération normale du rapport
```

Invariants à arbitrer et à tester avant implémentation :

- la source de vérité reste le générateur canonique de `/reports` ; la page
  d'historique ne possède aucun moteur de rapport spécifique aux actions ;
- le bouton prépare uniquement le périmètre initial du générateur et ne doit
  apparaître que pour une action réellement validée et autorisée ;
- l'identifiant canonique de l'action doit être transmis explicitement et de
  manière typée, puis résolu et vérifié par `/reports` côté serveur ;
- la configuration doit sélectionner exactement cette action, jamais les
  autres actions du même organisateur, territoire ou jour ;
- les paramètres visibles dans `/reports` devront rester compréhensibles,
  tandis que le template et le niveau de détail resteront des choix séparés ;
- le parcours devra réutiliser le pipeline canonique `/reports`, son
  versioning, ses méthodologies, son snapshot historique et sa traçabilité,
  sans traitement parallèle ;
- le point d'entrée devra pouvoir être étendu ultérieurement à une campagne,
  une organisation, un événement, un territoire ou un objectif mesurable sans
  multiplier les cas spéciaux.

## Règle de traitement

- Conserver ici les propositions propres à l'historique des actions.
- Déplacer les idées transverses au niveau du bloc `Agir` si nécessaire.
