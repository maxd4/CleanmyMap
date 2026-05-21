# CleanMyMap email setup

Configuration cible :

- envoi transactionnel via Resend
- domaine d’envoi : `mail.cleanmymap.fr`
- inbox de contact : `contact@cleanmymap.fr`
- réception gratuite via redirection LWS vers Gmail

## 1. Variables d’environnement

À définir dans `.env.local`, Vercel Preview et Vercel Production :

```bash
RESEND_API_KEY=...
EMAIL_FROM="CleanMyMap <contact@mail.cleanmymap.fr>"
CONTACT_EMAIL=contact@cleanmymap.fr
NEXT_PUBLIC_CONTACT_EMAIL=contact@cleanmymap.fr
```

Variables legacy encore acceptées par le code :

```bash
RESEND_FROM_EMAIL=...
RESEND_REPLY_TO=...
```

Le projet lit d’abord `EMAIL_FROM` et `CONTACT_EMAIL`.
Les composants client qui affichent ou ouvrent un `mailto:` lisent aussi `NEXT_PUBLIC_CONTACT_EMAIL` pour éviter les valeurs codées en dur.

## 2. DNS à créer dans LWS

Dans Resend, ajoute le domaine `mail.cleanmymap.fr`, puis récupère les enregistrements DNS affichés dans le dashboard.

Resend documente que la vérification de domaine repose sur :

- un enregistrement SPF
- un enregistrement DKIM
- un DMARC optionnel mais recommandé une fois SPF/DKIM validés

Pour ce projet, garde la configuration simple :

- vérifie le sous-domaine `mail.cleanmymap.fr` dans Resend
- publie les enregistrements DNS exactement comme Resend les fournit pour ce sous-domaine

Dans le DNS LWS, ajoute exactement les valeurs fournies par Resend. Les noms attendus sont généralement :

- SPF en `TXT`
- DKIM en `TXT` sur `resend._domainkey`
- DMARC en `TXT` sur `_dmarc` si tu l’actives

Ne crée pas d’enregistrement MX pour Resend dans ce setup, puisque la réception passe par LWS puis redirection Gmail.

## 3. Réception gratuite via LWS

Crée l’adresse `contact@cleanmymap.fr` ou une redirection équivalente dans LWS, puis redirige-la vers ta boîte Gmail personnelle.

LWS documente deux approches :

- création d’une adresse email de redirection dans le panel LWS
- redirection via cPanel ou webmail selon ton offre

Le plus simple est de configurer une redirection de `contact@cleanmymap.fr` vers Gmail, puis d’envoyer un message de test pour valider que le transfert arrive bien dans la boîte de destination.

## 4. Vérification dans Resend

Quand les DNS ont propagé :

1. retourne dans le dashboard Resend
2. lance la vérification du domaine
3. confirme que SPF et DKIM passent
4. ajoute DMARC ensuite si tu veux renforcer la politique du domaine

Resend indique qu’un domaine vérifié passe SPF et DKIM. DMARC devient ensuite un ajout de durcissement, pas un prérequis de base.

## 5. Test d’envoi

Depuis `apps/web`, tu peux tester avec l’endpoint admin `/api/send`.

Exemple :

```bash
curl -X POST http://localhost:3000/api/send \
  -H "content-type: application/json" \
  -H "x-resend-test-token: $RESEND_TEST_TOKEN" \
  -d '{"to":"contact@cleanmymap.fr","subject":"Test CleanMyMap","html":"<p>OK</p>"}'
```

Attendu :

- l’API répond avec un `id` Resend
- l’expéditeur est `CleanMyMap <contact@mail.cleanmymap.fr>`
- la réponse / le reply-to pointe vers `contact@cleanmymap.fr`

## 6. Sources officielles

- Resend domain verification and DNS records: https://resend.com/docs/dashboard/domains/introduction
- Resend DMARC: https://resend.com/docs/dashboard/domains/dmarc
- LWS redirection email: https://aide.lws.fr/base/Email/Adresses-mail--Premiers-pas/Comment-creer-une-redirection-email
- LWS redirection guide: https://tutoriels.lws.fr/e-mail/redirection-email
