# Vercel / Next.js — diagnostic de build

## Objet

Ce document est la source `CURRENT` pour diagnostiquer un build Next.js/Vercel
sans transformer chaque erreur en refactor global.

Il consolide les règles de triage et les anti-patterns déjà rencontrés dans
CleanMyMap.

## Principe

Ne pas lancer `next build` en boucle comme outil de découverte.

Ordre recommandé :

1. lire le log complet ;
2. classer l'erreur ;
3. exécuter le contrôle rapide correspondant ;
4. corriger la cause commune ;
5. relancer les contrôles ciblés ;
6. exécuter un build complet seulement lorsque le lot est cohérent.

## Classification des échecs

Classer d'abord le signal dans une famille :

```txt
TypeScript
lint
test / regression gate
frontière Server / Client
import ou module
App Router / route
variable d'environnement
fichier généré / cache .next
configuration Vercel
provisioning d'un service externe
Turbopack / bundler
HOST_ENVIRONMENT
```

Ne pas corriger une famille avec un contournement appartenant à une autre.

## Contrôles rapides

Selon le périmètre :

```bash
npm run typecheck -w apps/web
npm run lint -w apps/web
npm run test:regression-gates -w apps/web
npm run audit:vercel:ci
```

Les validations exactes restent gouvernées par les fichiers racine et
[`../development/TESTING.md`](../development/TESTING.md).

## TypeScript

Quand le build échoue sur TypeScript :

1. reproduire avec le typecheck ;
2. identifier la forme réelle de la donnée ;
3. corriger le type, le parseur ou la garde ;
4. traiter une cause partagée avant les erreurs secondaires ;
5. ne pas masquer le problème avec un cast aveugle.

Référence :
[`../development/typescript-precision-policy.md`](../development/typescript-precision-policy.md).

Pour une sortie détaillée ponctuelle, `tsc --noEmit --pretty false` peut aider
au diagnostic. Ne pas versionner cette sortie comme documentation courante.

## Frontière Server / Client

Un Client Component ne doit pas recevoir arbitrairement :

- une fonction serveur ;
- un composant brut utilisé comme callback ;
- un objet non sérialisable ;
- un accès qui exige un contexte serveur.

Préférer :

- données simples ;
- identifiants ;
- objets normalisés ;
- éléments déjà rendus lorsque le contrat React le permet ;
- reconstruction côté client à partir d'une clé sérialisable.

Ne pas basculer une page entière côté client pour contourner une erreur de
frontière.

Référence :
[`../development/client-server-bundle-splitting.md`](../development/client-server-bundle-splitting.md).

## Cache `.next` et générés

Ne nettoyer le cache que lorsqu'un signal l'implique réellement, par exemple :

- manifest incohérent ;
- comportement différent après un ancien build interrompu ;
- erreur explicitement liée à `.next` ou `.turbo`.

Utiliser la commande canonique du workspace lorsqu'elle existe.

Ne jamais :

- créer à la main un fichier interne `.next` ;
- fabriquer un manifest manquant ;
- modifier un généré pour cacher une erreur source ;
- supprimer des caches ou dépendances étrangers sans provenance établie.

## Variables d'environnement

Une erreur d'environnement n'est pas automatiquement une régression de code.

Vérifier :

- quelle variable est requise ;
- à quel stade elle est lue ;
- si elle est requise pour le runtime, le build, la preview ou uniquement une
  intégration optionnelle ;
- si l'échec provient du candidat ou de `HOST_ENVIRONMENT`.

Ne jamais committer une valeur secrète ou assouplir une validation de sécurité
pour faire passer le build.

## Configuration Vercel

Avant de modifier `vercel.json`, Next.js ou la CI :

1. vérifier que l'erreur vient réellement de la configuration ;
2. comparer le build local/candidat et le log Vercel ;
3. distinguer build applicatif, upload, provisioning et déploiement ;
4. éviter une bascule permanente de bundler comme premier contournement.

## Provisioning externe

Un déploiement ou une preview peut échouer avant ou après le build à cause d'un
service externe.

Cas déjà rencontré : une preview peut afficher un échec de type
`Resource provisioning failed` lorsque la création d'une branche Supabase
dépasse la capacité disponible. Dans ce cas :

- ne pas modifier le code Next.js pour corriger un problème de provisioning ;
- vérifier les ressources preview réellement actives ;
- nettoyer ou ajuster la stratégie de provisioning via l'outil propriétaire
  lorsque cela est autorisé ;
- distinguer clairement cette panne d'un build applicatif rouge.

Le message exact du fournisseur et l'état courant de la plateforme restent la
preuve à consulter.

## Turbopack / bundler

Si Turbopack bloque :

1. reproduire le problème sur l'arbre candidat pertinent ;
2. déterminer s'il s'agit du code, d'une dépendance, de la configuration ou de
   l'environnement ;
3. vérifier les limitations documentées du chemin concerné ;
4. garder le bundler canonique tant qu'un changement structurel n'est pas
   justifié.

Ne pas imposer Webpack ou une autre chaîne uniquement parce qu'une première
tentative échoue.

## Anti-patterns

Éviter :

- un build complet après chaque micro-correction ;
- un mélange typage + architecture + bundler dans le même diagnostic ;
- un cast TypeScript décoratif ;
- une modification de cache sans preuve ;
- la création manuelle de générés ;
- une baisse de validation d'environnement ;
- un changement de runtime pour résoudre un problème de provisioning externe ;
- un changement de bundler avant qualification de la cause.

## Fin de triage

Le diagnostic est suffisamment fermé lorsque :

- la famille d'erreur est identifiée ;
- la cause est reproduite avec le contrôle le plus petit pertinent ;
- la correction ne masque pas une autre responsabilité ;
- les contrôles ciblés passent ;
- le build complet nécessaire passe sur l'arbre candidat attendu ;
- un problème de plateforme externe est explicitement distingué du code.

## Références

- [`platform-cost-governance.md`](./platform-cost-governance.md)
- [`runbook-deploiement.md`](./runbook-deploiement.md)
- [`../development/TESTING.md`](../development/TESTING.md)
- [`../development/typescript-precision-policy.md`](../development/typescript-precision-policy.md)
- [`../development/client-server-bundle-splitting.md`](../development/client-server-bundle-splitting.md)
