import Link from "next/link";
import { ChevronDown, GitBranch, Info, Mail, MessageCircle } from "lucide-react";
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
  "cmm-ribbon-frame cmm-ribbon-surface relative block w-full min-w-0";

const FOOTER_CONTENT_CLASS =
  "relative z-10 box-border w-full min-w-0";

export function HomeFooter() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <footer aria-label="Pied de page" className={FOOTER_RIBBON_CLASS}>
      <div className={`${FOOTER_CONTENT_CLASS} cmm-ribbon-text`}>
        <div className="cmm-footer-row px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
          <div className="cmm-footer-brand flex min-w-0 items-center gap-3 text-center sm:gap-2.5 sm:text-left">
            <BrandLogo
              variant="darkSurface"
              alt="CleanMyMap"
              className="cmm-footer-brand-logo h-10 w-auto max-w-[12rem] shrink-0 object-contain object-left"
              sizes="12rem"
            />
            <Link
              href="/contact"
              aria-label="Contacter CleanMyMap"
              className="cmm-ribbon-text group inline-flex min-w-0 shrink items-center gap-2 font-bold uppercase tracking-[0.16em] text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <MessageCircle className="cmm-footer-brand-contact-icon h-4 w-4 shrink-0 text-white" aria-hidden="true" />
              <span className="cmm-footer-contact-separator h-px w-4 bg-slate-400/50" />
              <span className="cmm-footer-contact-label break-words text-white transition group-hover:text-white group-hover:underline">
                Contact
              </span>
            </Link>
          </div>

          <div className="cmm-footer-contact-actions">
            <a
              href={`mailto:${contactEmail}`}
              aria-label={`Écrire à ${contactEmail}`}
              className="cmm-footer-contact-link group rounded-xl border border-slate-700/80 bg-slate-950/55 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="cmm-footer-contact-label text-white transition-colors group-hover:text-white">
                {contactEmail}
              </span>
            </a>
            <a
              href="https://instagram.com/cleanmymap.fr"
              aria-label="Instagram CleanMyMap"
              target="_blank"
              rel="noopener noreferrer"
              className="cmm-footer-contact-link group rounded-xl border border-slate-700/80 bg-slate-950/55 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <InstagramMark size={18} className="h-4 w-4 text-white" />
              </div>
              <span className="cmm-footer-contact-label text-white transition-colors group-hover:text-white">
                @cleanmymap.fr
              </span>
            </a>
            <a
              href="https://github.com/maxd4/CleanMyMap"
              aria-label="GitHub CleanMyMap"
              target="_blank"
              rel="noopener noreferrer"
              className="cmm-footer-contact-link group rounded-xl border border-slate-700/80 bg-slate-950/55 transition-all hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/70 transition-colors group-hover:bg-slate-800/80">
                <GitBranch className="h-4 w-4 text-white" />
              </div>
              <span className="cmm-footer-contact-label text-white transition-colors group-hover:text-white">
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

          <details className="cmm-footer-information">
            <summary className="cmm-footer-information-trigger cmm-ribbon-text rounded-xl border border-slate-700/80 bg-slate-950/55 font-semibold uppercase tracking-[0.1em] text-white transition hover:border-slate-500 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/50">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Informations</span>
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            </summary>
            <div
              className="cmm-footer-information-panel"
              role="region"
              aria-label="Informations"
            >
              <nav
                aria-label="Informations légales et préférences cookies"
                className="cmm-footer-information-links"
              >
                <Link href="/mentions-legales" className="cmm-footer-information-link">
                  Mentions légales
                </Link>
                <Link href="/conditions-generales-utilisation" className="cmm-footer-information-link">
                  CGU
                </Link>
                <Link href="/politique-confidentialite" className="cmm-footer-information-link">
                  Confidentialité
                </Link>
                <Link href="/politique-cookies" className="cmm-footer-information-link">
                  Politique cookies
                </Link>
                <CookiePreferencesButton />
              </nav>
            </div>
          </details>

          <div className="cmm-footer-signature cmm-ribbon-text shrink-0 whitespace-nowrap text-center text-white">
            <p className="font-bold">Cultivons l&apos;entraide</p>
            <p>© 2026 CleanMyMap</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
