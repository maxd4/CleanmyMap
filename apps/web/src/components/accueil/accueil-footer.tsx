import Link from "next/link";
import { GitBranch, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { CookiePreferencesButton } from "./cookie-preferences-button";

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

const FOOTER_RIBBON_CLASS =
  "cmm-ribbon-frame cmm-ribbon-surface relative block w-full min-w-0 overflow-hidden";

const FOOTER_CONTENT_CLASS =
  "relative z-10 box-border w-full min-w-0";

export function HomeFooter() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <footer className={FOOTER_RIBBON_CLASS}>
      <div className={`${FOOTER_CONTENT_CLASS} cmm-ribbon-text px-3 py-6 sm:px-5 sm:py-7 lg:px-7 lg:py-8`}>
        <div className="flex min-w-0 max-w-full flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_max-content] lg:items-center lg:gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(29rem,max-content)_minmax(0,15fr)]">
          <div className="flex min-w-0 items-center gap-3 text-center sm:gap-2.5 sm:text-left">
            <BrandLogo
              variant="darkSurface"
              alt="CleanMyMap"
              className="h-10 w-auto max-w-[12rem] shrink-0 object-contain object-left"
              sizes="12rem"
            />
            <Link
              href="/contact"
              className="cmm-ribbon-text group inline-flex min-w-0 shrink items-center gap-2 font-bold uppercase tracking-[0.16em] text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <span className="h-px w-4 bg-slate-400/50" />
              <span className="break-words text-white transition group-hover:text-white group-hover:underline">
                Contact
              </span>
            </Link>
          </div>

          <div className="cmm-footer-contact-actions lg:col-start-2 lg:row-start-1 lg:justify-self-center xl:col-start-2">
            <a
              href={`mailto:${contactEmail}`}
              className="cmm-footer-contact-link group rounded-xl border border-slate-700/80 bg-slate-950/55 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="text-white transition-colors group-hover:text-white">
                {contactEmail}
              </span>
            </a>
            <a
              href="https://instagram.com/cleanmymap.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="cmm-footer-contact-link group rounded-xl border border-slate-700/80 bg-slate-950/55 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <InstagramMark size={18} className="h-4 w-4 text-white" />
              </div>
              <span className="text-white transition-colors group-hover:text-white">
                @cleanmymap.fr
              </span>
            </a>
            <a
              href="https://github.com/maxd4/CleanMyMap"
              target="_blank"
              rel="noopener noreferrer"
              className="cmm-footer-contact-link group rounded-xl border border-slate-700/80 bg-slate-950/55 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <GitBranch className="h-4 w-4 text-white" />
              </div>
              <span className="text-white transition-colors group-hover:text-white">
                GitHub
              </span>
            </a>
          </div>

          <nav
            aria-label="Liens légaux"
            className="cmm-footer-legal-links cmm-ribbon-text flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-700/60 pt-1 font-semibold uppercase tracking-[0.1em] text-white sm:pt-0 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:justify-end xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:border-t-0"
          >
            <Link href="/mentions-legales" className="shrink-0 whitespace-nowrap transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
              Mentions légales
            </Link>
            <Link
              href="/conditions-generales-utilisation"
              className="shrink-0 whitespace-nowrap transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              CGU
            </Link>
            <Link
              href="/politique-confidentialite"
              className="shrink-0 whitespace-nowrap transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              Confidentialité
            </Link>
            <Link
              href="/politique-cookies"
              className="shrink-0 whitespace-nowrap transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              Politique cookies
            </Link>
            <CookiePreferencesButton />
            <div className="cmm-ribbon-text mt-2 shrink-0 whitespace-nowrap text-center text-white">
              <p className="font-bold">Cultivons l&apos;entraide</p>
              <p>© 2026 CleanMyMap</p>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
