"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { shouldUseFullFooter } from "@/lib/ui/footer-variant";

function InstagramMark({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export type HomeFooterProps = {
  variant?: "full" | "compact";
  initialVariant?: "full" | "compact";
};

export function HomeFooter({ variant, initialVariant }: HomeFooterProps) {
  const pathname = usePathname() ?? "/";
  const resolvedVariant = variant ?? initialVariant ?? (shouldUseFullFooter(pathname) ? "full" : "compact");

  const isCompact = resolvedVariant === "compact";
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  if (isCompact) {
    return (
      <footer className="cmm-ribbon-surface relative w-full overflow-hidden">

        <div className="relative z-10 mx-auto flex w-full max-w-none flex-col items-center justify-between gap-3 px-1 py-4 text-center sm:px-2 md:flex-row md:gap-5 md:py-5 md:text-left lg:px-4">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              Cultivons l&apos;entraide
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
              © 2026 CleanMyMap
            </p>
          </div>

          <nav
            aria-label="Liens légaux"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white md:justify-end"
          >
            <Link href="/mentions-legales" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
              Mentions légales
            </Link>
            <Link
              href="/conditions-generales-utilisation"
              className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              CGU
            </Link>
            <Link
              href="/politique-confidentialite"
              className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              Confidentialité
            </Link>
            <Link href="/politique-cookies" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="cmm-ribbon-surface relative w-full overflow-hidden">

      <div className="relative z-10 mx-auto w-full max-w-none px-1 py-6 sm:px-2 sm:py-7 lg:px-4 lg:py-8">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
          {/* Gauche : Contact discret */}
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left lg:items-center">
          <div className="flex shrink-0 items-center gap-2">
            <span className="h-px w-4 bg-slate-400/50" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white">
              Contact
            </p>
          </div>
          <Link
            href="/contact"
            className="group inline-flex min-h-10 max-w-full items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/55 px-3.5 py-2.5 text-center transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 sm:justify-start"
          >
              <span className="text-sm font-semibold leading-snug text-white transition-colors group-hover:text-white">
                Une question ? Un partenariat ? Échangeons !
              </span>
            </Link>
          </div>

          {/* Centre : Liens de contact compacts */}
          <div className="flex min-w-0 flex-wrap justify-center gap-2.5 lg:justify-center">
            <a
              href={`mailto:${contactEmail}`}
              className="group flex min-h-10 max-w-full items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-950/55 px-3.5 py-2 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <Mail size={16} className="text-white" />
              </div>
              <span className="min-w-0 truncate text-xs font-bold text-white transition-colors group-hover:text-white sm:text-sm">
                {contactEmail}
              </span>
            </a>
            <a
              href="https://instagram.com/cleanmymap.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-10 max-w-full items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-950/55 px-3.5 py-2 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <InstagramMark size={16} className="text-white" />
              </div>
              <span className="min-w-0 truncate text-xs font-bold text-white transition-colors group-hover:text-white sm:text-sm">
                @cleanmymap.fr
              </span>
            </a>
          </div>

          {/* Droite : Slogan, Mantra & Copyright unifiés sur une ligne desktop */}
          <div className="flex min-w-0 flex-col items-center text-center lg:col-span-1 lg:items-end lg:text-right">
            <div className="flex min-w-0 flex-col items-center gap-2 lg:items-end">
              <p className="text-[13px] font-bold uppercase leading-snug text-white sm:text-sm">
                Dépolluer <span className="text-white">·</span>{" "}
                Cartographier <span className="text-white">·</span>{" "}
                Impacter
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:justify-end">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  Cultivons l&apos;entraide
                </p>
                <span className="h-1 w-1 rounded-full bg-slate-500/60" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  © 2026 CleanMyMap
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-700/60 pt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-white lg:justify-end">
          <Link href="/mentions-legales" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
            Mentions légales
          </Link>
          <Link
            href="/conditions-generales-utilisation"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
          >
            CGU
          </Link>
          <Link
            href="/politique-confidentialite"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
          >
            Confidentialité
          </Link>
          <Link href="/politique-cookies" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
