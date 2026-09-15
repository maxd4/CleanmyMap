"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { requestCookieConsentPreferences } from "@/lib/storage/ui-state-storage";
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

const FOOTER_RIBBON_CLASS =
  "cmm-ribbon-surface relative block w-full max-w-full min-w-0 overflow-hidden";

const FOOTER_CONTENT_CLASS =
  "relative z-10 mx-auto box-border w-full max-w-full min-w-0";

export function HomeFooter({ variant, initialVariant }: HomeFooterProps) {
  const pathname = usePathname() ?? "/";
  const resolvedVariant = variant ?? (shouldUseFullFooter(pathname) ? "full" : initialVariant ?? "compact");

  const isCompact = resolvedVariant === "compact";
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  if (isCompact) {
    return (
      <footer className={FOOTER_RIBBON_CLASS}>

        <div className={`${FOOTER_CONTENT_CLASS} flex flex-col items-center justify-between gap-3 px-1 py-4 text-center sm:px-2 md:flex-row md:gap-5 md:py-5 md:text-left lg:px-4`}>
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <BrandLogo
              variant="darkSurface"
              alt="CleanMyMap"
              className="h-6 w-auto max-w-[7rem] shrink object-contain object-left sm:h-7 sm:max-w-[9rem]"
              sizes="9rem"
            />
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1 md:items-start">
              <p className="break-words text-[9px] font-bold uppercase tracking-[0.14em] text-white sm:text-[10px] sm:tracking-[0.18em]">
                Cultivons l&apos;entraide
              </p>
              <p className="break-words text-[9px] font-semibold uppercase tracking-[0.12em] text-white sm:text-[10px] sm:tracking-[0.16em]">
                © 2026 CleanMyMap
              </p>
            </div>
          </div>

          <nav
            aria-label="Liens légaux"
            className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-white sm:text-[10px] sm:tracking-[0.15em] md:justify-end"
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
              Politique cookies
            </Link>
            <button
              type="button"
              onClick={requestCookieConsentPreferences}
              className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              Gérer mes cookies
            </button>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className={FOOTER_RIBBON_CLASS}>
      <div className={`${FOOTER_CONTENT_CLASS} px-1 py-6 sm:px-2 sm:py-7 lg:px-4 lg:py-8`}>
        <div className="flex min-w-0 max-w-full flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)] lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-3 text-center sm:gap-2.5 sm:text-left">
            <BrandLogo
              variant="darkSurface"
              alt="CleanMyMap"
              className="h-7 w-auto max-w-[9rem] shrink-0 object-contain object-left"
              sizes="9rem"
            />
            <Link
              href="/contact"
              className="group inline-flex min-w-0 shrink items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 sm:text-[10px] sm:tracking-[0.22em]"
            >
              <span className="h-px w-4 bg-slate-400/50" />
              <span className="break-words text-white transition group-hover:text-white group-hover:underline">
                Contact
              </span>
            </Link>
          </div>

          <div className="flex min-w-0 max-w-full flex-wrap justify-center gap-2.5 lg:justify-center">
            <a
              href={`mailto:${contactEmail}`}
              className="group flex min-h-10 min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-950/55 px-3.5 py-2 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80 sm:h-8 sm:w-8">
                <Mail className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
              </div>
              <span className="min-w-0 break-words text-xs font-bold text-white transition-colors group-hover:text-white sm:text-sm">
                {contactEmail}
              </span>
            </a>
            <a
              href="https://instagram.com/cleanmymap.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-10 min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-950/55 px-3.5 py-2 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80 sm:h-8 sm:w-8">
                <InstagramMark size={16} className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
              </div>
              <span className="min-w-0 break-words text-xs font-bold text-white transition-colors group-hover:text-white sm:text-sm">
                @cleanmymap.fr
              </span>
            </a>
          </div>

          <nav
            aria-label="Liens légaux"
            className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-700/60 pt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white sm:pt-0 sm:text-[10px] sm:tracking-[0.15em] lg:justify-end lg:border-t-0"
          >
            <Link href="/mentions-legales" className="break-words transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
              Mentions légales
            </Link>
            <Link
              href="/conditions-generales-utilisation"
              className="break-words transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              CGU
            </Link>
            <Link
              href="/politique-confidentialite"
              className="break-words transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              Confidentialité
            </Link>
            <Link
              href="/politique-cookies"
              className="break-words transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              Politique cookies
            </Link>
            <button
              type="button"
              onClick={requestCookieConsentPreferences}
              className="break-words text-[9px] font-semibold uppercase tracking-[0.1em] text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50 sm:text-[10px] sm:tracking-[0.15em]"
            >
              Gérer mes cookies
            </button>
                          <div className="mt-2 text-center text-xs text-white">
                  <p className="font-bold">Cultivons l&apos;entraide</p>
                  <p>© 2026 CleanMyMap</p>
                </div>
                </nav>
        </div>
      </div>
    </footer>
  );
}
