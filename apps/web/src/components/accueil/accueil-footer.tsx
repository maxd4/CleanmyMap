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
      <div className={`${FOOTER_CONTENT_CLASS} cmm-ribbon-text`}>
        <div
          className="cmm-footer-scroll"
          tabIndex={0}
          role="region"
          aria-label="Pied de page"
        >
          <div className="cmm-footer-row px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
            <div className="cmm-footer-brand flex min-w-0 items-center gap-3 text-center sm:gap-2.5 sm:text-left">
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

            <div className="cmm-footer-contact-actions">
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
              className="cmm-footer-legal-links cmm-ribbon-text font-semibold uppercase tracking-[0.1em] text-white"
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
            </nav>

            <div className="cmm-footer-signature cmm-ribbon-text shrink-0 whitespace-nowrap text-center text-white">
              <p className="font-bold">Cultivons l&apos;entraide</p>
              <p>© 2026 CleanMyMap</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
