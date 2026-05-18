"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/email-config";

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

type HomeFooterProps = {
  variant?: "full" | "compact";
};

const FULL_FOOTER_PATHS = [
  "/",
  "/accueil",
  "/explorer",
  "/dashboard",
  "/sections/feedback",
  "/contact",
  "/a-propos",
  "/about",
] as const;

const FULL_FOOTER_PREFIXES = ["/landing"] as const;

function shouldUseFullFooter(pathname: string): boolean {
  return (
    FULL_FOOTER_PATHS.includes(pathname as (typeof FULL_FOOTER_PATHS)[number]) ||
    FULL_FOOTER_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export function HomeFooter({ variant }: HomeFooterProps) {
  const pathname = usePathname() ?? "/";
  const resolvedVariant = variant ?? (shouldUseFullFooter(pathname) ? "full" : "compact");
  const isCompact = resolvedVariant === "compact";
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  if (isCompact) {
    return (
      <footer className="relative w-full overflow-hidden border-t border-cyan-200/10 bg-[linear-gradient(180deg,rgba(4,9,19,0)_0%,rgba(5,18,32,0.92)_42%,#04111f_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_42%_120%_at_12%_0%,rgba(34,211,238,0.10),transparent_66%),radial-gradient(ellipse_38%_110%_at_92%_10%,rgba(16,185,129,0.10),transparent_68%)]" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:px-8 md:flex-row md:gap-5 md:py-5 md:text-left">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              Cultivons l&apos;entraide
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              © 2026 CleanMyMap
            </p>
          </div>

          <nav
            aria-label="Liens légaux"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 md:justify-end"
          >
            <Link href="/mentions-legales" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
              Mentions légales
            </Link>
            <Link
              href="/conditions-generales-utilisation"
              className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            >
              CGU
            </Link>
            <Link
              href="/politique-confidentialite"
              className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            >
              Confidentialité
            </Link>
            <Link href="/politique-cookies" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative w-full overflow-hidden border-t border-cyan-200/10 bg-[linear-gradient(180deg,rgba(4,9,19,0)_0%,rgba(5,18,32,0.94)_28%,#04111f_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_90%_at_10%_0%,rgba(34,211,238,0.13),transparent_62%),radial-gradient(ellipse_46%_76%_at_92%_12%,rgba(16,185,129,0.12),transparent_64%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-7 lg:py-8">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
          {/* Gauche : Contact discret */}
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left lg:items-center">
            <div className="flex shrink-0 items-center gap-2">
              <span className="h-px w-4 bg-emerald-300/60" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">
                Contact
              </p>
            </div>
            <Link
              href="/contact"
              className="group inline-flex min-h-10 max-w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] px-3.5 py-2.5 text-center transition-all hover:border-emerald-300/45 hover:bg-white/[0.095] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50 sm:justify-start"
            >
              <span className="text-sm font-semibold leading-snug text-slate-100 transition-colors group-hover:text-white">
                Une question ? Un partenariat ? Échangeons !
              </span>
            </Link>
          </div>

          {/* Centre : Liens de contact compacts */}
          <div className="flex min-w-0 flex-wrap justify-center gap-2.5 lg:justify-center">
            <a
              href={`mailto:${contactEmail}`}
              className="group flex min-h-10 max-w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.055] px-3.5 py-2 transition-all hover:border-emerald-300/45 hover:bg-white/[0.095] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-300/14 transition-colors group-hover:bg-emerald-300/22">
                <Mail size={16} className="text-emerald-200" />
              </div>
              <span className="min-w-0 truncate text-xs font-bold text-slate-100 transition-colors group-hover:text-white sm:text-sm">
                {contactEmail}
              </span>
            </a>
            <a
              href="https://instagram.com/cleanmymap.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-10 max-w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.055] px-3.5 py-2 transition-all hover:border-pink-300/45 hover:bg-white/[0.095] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-300/14 transition-colors group-hover:bg-pink-300/22">
                <InstagramMark size={16} className="text-pink-200" />
              </div>
              <span className="min-w-0 truncate text-xs font-bold text-slate-100 transition-colors group-hover:text-white sm:text-sm">
                @cleanmymap.fr
              </span>
            </a>
          </div>

          {/* Droite : Slogan, Mantra & Copyright unifiés sur une ligne desktop */}
          <div className="flex min-w-0 flex-col items-center text-center lg:col-span-1 lg:items-end lg:text-right">
            <div className="flex min-w-0 flex-col items-center gap-2 lg:items-end">
              <p className="text-[13px] font-bold uppercase leading-snug text-white sm:text-sm">
                Dépolluer <span className="text-cyan-400/50">·</span>{" "}
                Cartographier <span className="text-emerald-400/50">·</span>{" "}
                Impacter
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:justify-end">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  Cultivons l&apos;entraide
                </p>
                <span className="h-1 w-1 rounded-full bg-slate-500/70" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  © 2026 CleanMyMap
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/8 pt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 lg:justify-end">
          <Link href="/mentions-legales" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
            Mentions légales
          </Link>
          <Link
            href="/conditions-generales-utilisation"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
          >
            CGU
          </Link>
          <Link
            href="/politique-confidentialite"
            className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
          >
            Confidentialité
          </Link>
          <Link href="/politique-cookies" className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
