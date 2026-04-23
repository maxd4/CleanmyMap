export type ServiceHealthState = "ready" | "missing" | "defer" | "external";

export type ServiceDefinition = {
  id: string;
  label: string;
  description: string;
  category: "critical" | "optional" | "external";
};

export const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  {
    id: "supabase",
    label: "Supabase",
    description: "Base de données et authentification pour l'application.",
    category: "critical",
  },
  {
    id: "clerk",
    label: "Clerk",
    description: "Gestion des utilisateurs et authentification front-end.",
    category: "critical",
  },
  {
    id: "sentry",
    label: "Sentry",
    description: "Supervision des erreurs et suivi de la stabilité.",
    category: "optional",
  },
  {
    id: "resend",
    label: "Resend",
    description: "Envoi d'e-mails transactionnels et de notifications.",
    category: "optional",
  },
  {
    id: "posthog",
    label: "PostHog",
    description: "Analyse du trafic et comportement utilisateur.",
    category: "optional",
  },
  {
    id: "pinecone",
    label: "Pinecone",
    description: "Moteur de recherche sémantique pour les fonctionnalités IA.",
    category: "optional",
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Paiements et webhooks de facturation.",
    category: "optional",
  },
  {
    id: "upstash",
    label: "Upstash",
    description: "Cache Redis sécurisé pour les flux asynchrones.",
    category: "optional",
  },
  {
    id: "vercel",
    label: "Vercel",
    description: "Plateforme d'hébergement et runtime d'exécution.",
    category: "external",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    description: "Protection et routage CDN externalisés.",
    category: "external",
  },
  {
    id: "uptimerobot",
    label: "Uptime Robot",
    description: "Surveillance externe des endpoints du site.",
    category: "external",
  },
];
