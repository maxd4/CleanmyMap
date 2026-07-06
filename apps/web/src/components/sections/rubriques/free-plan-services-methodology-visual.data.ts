import {
  BarChart3,
  Bot,
  CreditCard,
  Fingerprint,
  GitBranch,
  Globe,
  Leaf,
  Mail,
  Monitor,
  PieChart,
  Plug,
  Radar,
  ShieldAlert,
  Sparkles,
  Triangle,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type QuotaDisplayServiceKey = "supabase" | "vercel" | "github" | "resend" | "posthog" | "lwsDomain";

export type MethodologyTabKey = "quota" | "impact";

export const TAB_ITEMS = [
  { key: "quota", label: "Quotas & plans", icon: PieChart },
  { key: "impact", label: "Impact carbone", icon: Leaf },
] as const;

export const DISPLAY_ORDER: Array<{ key: QuotaDisplayServiceKey; label: string; icon: LucideIcon; accent: string }> = [
  { key: "supabase", label: "Supabase", icon: Zap, accent: "#34d399" },
  { key: "vercel", label: "Vercel", icon: Triangle, accent: "#111827" },
  { key: "github", label: "GitHub", icon: GitBranch, accent: "#111827" },
  { key: "resend", label: "Resend", icon: Mail, accent: "#f97316" },
  { key: "posthog", label: "PostHog", icon: BarChart3, accent: "#f97316" },
  { key: "lwsDomain", label: "LWS", icon: Globe, accent: "#ef4444" },
];

export const IMPACT_VISUALS: Record<
  "vercel" | "github" | "supabase" | "resend" | "chatgpt" | "codex" | "clerk" | "posthog" | "sentry" | "upstash" | "pinecone" | "stripe" | "lwsDomain",
  { icon: LucideIcon; color: string }
> = {
  vercel: { icon: Triangle, color: "#111827" },
  github: { icon: GitBranch, color: "#111827" },
  supabase: { icon: Zap, color: "#34d399" },
  resend: { icon: Mail, color: "#f97316" },
  chatgpt: { icon: Sparkles, color: "#ef4444" },
  codex: { icon: Bot, color: "#ef4444" },
  clerk: { icon: Fingerprint, color: "#6366f1" },
  posthog: { icon: BarChart3, color: "#f97316" },
  sentry: { icon: ShieldAlert, color: "#f43f5e" },
  upstash: { icon: Plug, color: "#22c55e" },
  pinecone: { icon: Radar, color: "#14b8a6" },
  stripe: { icon: CreditCard, color: "#8b5cf6" },
  lwsDomain: { icon: Globe, color: "#ef4444" },
};

export const SUPABASE_IMPACT_POSTS = [
  {
    label: "Base de données",
    description: "Stockage PostgreSQL, tables, index, historiques, logs.",
  },
  {
    label: "Requêtes base de données",
    description: "Lectures, écritures, agrégations, requêtes lourdes.",
    metricKey: "supabaseDbRequests",
  },
  {
    label: "Storage",
    description: "Photos, exports PDF, images, pièces jointes.",
    metricKey: "supabaseStorageGbMonths",
  },
  {
    label: "Bande passante",
    description: "Fichiers servis, images téléchargées, exports récupérés.",
    metricKey: "supabaseEgressGb",
  },
  {
    label: "Edge Functions",
    description: "Exécutions serveur et calculs.",
  },
  {
    label: "Backups",
    description: "Sauvegardes et rétention.",
  },
  {
    label: "Logs",
    description: "Volume conservé.",
  },
] as const;

export const VERCEL_IMPACT_POSTS = [
  {
    label: "Builds",
    description: "Compilation Next.js, previews, déploiements.",
    metricKey: "vercelDeployments",
  },
  {
    label: "Hébergement frontend",
    description: "Pages servies, rendu serveur, routes dynamiques.",
    metricKey: "vercelPageViews",
  },
  {
    label: "Serverless Functions",
    description: "Exécutions backend, durée, mémoire.",
    metricKey: "vercelFunctionInvocations",
  },
  {
    label: "Edge Middleware / Edge Functions",
    description: "Traitements à la requête.",
  },
  {
    label: "Bande passante",
    description: "JS, CSS, images, polices, assets.",
    metricKey: "vercelBandwidthGb",
  },
  {
    label: "Image Optimization",
    description: "Transformations, cache, variantes générées.",
  },
  {
    label: "Preview deployments",
    description: "Environnements de test conservés.",
  },
  {
    label: "Logs",
    description: "Volume et durée de conservation.",
  },
] as const;

export const GITHUB_IMPACT_POSTS = [
  {
    label: "Stockage du dépôt",
    description: "Code source, historique Git, branches, tags.",
  },
  {
    label: "GitHub Actions",
    description: "CI/CD, tests, lint, builds automatiques.",
    metricKey: "githubWorkflowRunsCount30d",
  },
  {
    label: "Artefacts CI",
    description: "Rapports, caches, fichiers générés.",
  },
  {
    label: "Packages / Registry",
    description: "Stockage et transferts si utilisé.",
  },
  {
    label: "Clones et téléchargements",
    description: "Bande passante du dépôt.",
  },
  {
    label: "Pull requests",
    description: "Déclenchement indirect de builds et previews.",
  },
] as const;

export const RESEND_IMPACT_POSTS = [
  {
    label: "Emails envoyés",
    description: "Notifications, emails transactionnels.",
    metricKey: "resendEmailsSent",
  },
  {
    label: "Taille des emails",
    description: "HTML, images, pièces jointes éventuelles.",
  },
  {
    label: "Templates",
    description: "Rendu et génération.",
  },
  {
    label: "Webhooks",
    description: "Appels sortants.",
  },
  {
    label: "Logs d'emails",
    description: "Événements, erreurs, statuts.",
  },
  {
    label: "Réessais d'envoi",
    description: "Emails échoués puis renvoyés.",
  },
] as const;

export const POSTHOG_IMPACT_POSTS = [
  {
    label: "Événements collectés",
    description: "Vues, clics, actions utilisateur.",
    metricKey: "posthogEvents",
  },
  {
    label: "Sessions enregistrées",
    description: "Session replay si activé.",
  },
  {
    label: "Profils utilisateurs",
    description: "Propriétés et identifiants.",
  },
  {
    label: "Feature flags",
    description: "Évaluations client ou serveur.",
  },
  {
    label: "Dashboards",
    description: "Calculs analytiques.",
  },
  {
    label: "Rétention",
    description: "Durée de conservation.",
  },
  {
    label: "Exports",
    description: "CSV, API ou extraction externe.",
  },
] as const;

export const LWS_IMPACT_POSTS = [
  {
    label: "Nom de domaine",
    description: "Enregistrement et gestion DNS.",
    metricKey: "lwsDomainYears",
  },
  {
    label: "DNS",
    description: "Requêtes de résolution.",
    metricKey: "lwsDnsQueries",
  },
  {
    label: "Emails ou redirections",
    description: "Utilisés si activés.",
  },
  {
    label: "Hébergement",
    description: "Si activé.",
  },
  {
    label: "Certificats SSL",
    description: "Si gérés par LWS.",
  },
  {
    label: "Services additionnels",
    description: "Sauvegardes, anti-spam, sécurité, monitoring.",
  },
] as const;
