import Link from "next/link";

const stackRows = [
  { name: "Supabase", status: "P0" },
  { name: "Vercel", status: "P0" },
  { name: "Clerk", status: "P0" },
  { name: "Sentry", status: "P0" },
  { name: "PostHog", status: "P1" },
  { name: "Resend", status: "P1" },
  { name: "Cloudflare", status: "P1" },
  { name: "UptimeRobot", status: "P1" },
  { name: "Stripe", status: "P2" },
  { name: "Pinecone", status: "P2" },
  { name: "Upstash", status: "P2" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Migration active</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          CleanMyMap modern stack baseline
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Cette application remplace progressivement l&apos;interface Streamlit avec une architecture plus robuste et scalable.
          Les premiers blocs production-ready sont en place: auth, API routes, metadata SEO et observabilité.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/sign-in" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Se connecter
          </Link>
          <Link href="/sign-up" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            Créer un compte
          </Link>
          <Link href="/api/health" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            API health
          </Link>
          <Link href="/api/services" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            Service status
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Priorités d&apos;intégration</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Service</th>
                <th className="py-2 pr-4 font-medium">Priorité</th>
              </tr>
            </thead>
            <tbody>
              {stackRows.map((row) => (
                <tr key={row.name} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-800">{row.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Prochaine étape recommandée</h2>
        <p className="mt-3 text-sm text-slate-600">
          Les premiers parcours métier sont disponibles sur routes protégées Next.js: déclaration, historique, vue terrain.
        </p>
        <Link href="/dashboard" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Ouvrir le dashboard prototype
        </Link>
      </section>
    </main>
  );
}
