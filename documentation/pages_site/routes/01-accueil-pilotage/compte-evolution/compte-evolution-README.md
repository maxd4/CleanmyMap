# Évolution du compte

- **Route** : `/compte/evolution`
- **Fichier source** : `apps/web/src/app/(app)/compte/evolution/page.tsx`
- **Type fonctionnel** : page de compte protégée
- **Famille / bloc fonctionnel** : Accueil & Pilotage
- **Objectif utilisateur principal** : comprendre le niveau obtenu, le rôle utilisé et l’état de sa demande d’évolution.
- **Surface canonique** : le formulaire `PromotionRequestForm` et le suivi des demandes sont centralisés ici.
- **Accès** : utilisateur authentifié ; la lecture API est limitée aux demandes du userId Clerk courant.
- **Rôles ouverts** : Bénévole, Association, Scientifique, Entreprise.
- **Rôles obtenus** : Élu·e et Administrateur, après acceptation IMU.
- **Hors parcours** : IMU.

La route est la destination unique des liens « Évolution du compte » depuis
le menu de compte, le sélecteur de rôle, le Dashboard, les profils et les
contenus de gouvernance. L’onboarding peut également y renvoyer via un lien
secondaire, sans attribuer de rôle automatiquement.

La demande n’altère jamais le niveau obtenu. Une demande en attente remplace le formulaire par son état d’examen ; une demande refusée peut être renouvelée si le niveau courant l’autorise ; une demande acceptée est reflétée après synchronisation du compte.
