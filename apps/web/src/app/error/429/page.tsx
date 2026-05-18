import { Gauge } from "lucide-react";
import Link from "next/link";
import { resolvePublicContactEmail } from "@/lib/email-config";

export default function RateLimitErrorPage() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Gauge className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold cmm-text-primary">
          Trop de requêtes
        </h1>

        <p className="cmm-text-secondary">
          Vous avez envoyé trop de demandes en peu de temps. 
          Veuillez patienter quelques instants avant de réessayer.
        </p>

        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-2">
          <p className="text-sm cmm-text-secondary">
            <strong>Pourquoi cette limite ?</strong>
          </p>
          <p className="text-xs cmm-text-muted">
            Cette limite protège le service contre les abus et assure 
            une bonne qualité pour tous les utilisateurs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/accueil"
            className="px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 cmm-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>

        <p className="text-xs cmm-text-muted">
          Si le problème persiste, contactez-nous à {contactEmail}
        </p>
      </div>
    </div>
  );
}
