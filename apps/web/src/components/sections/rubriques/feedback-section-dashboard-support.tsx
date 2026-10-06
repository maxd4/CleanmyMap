import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FEEDBACK_SUPPORT_LINKS, localize, type Locale } from "./feedback-section.shared";

export function FeedbackSectionDashboardSupport({
  locale,
  fr,
}: {
  locale: Locale;
  fr: boolean;
}) {
  return (
    <aside className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm">
      <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
        {fr ? "Une question ?" : "A question?"}
      </h2>
      <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
        {fr
          ? "Consultez notre centre d'aide ou contactez-nous."
          : "Check our help center or contact us."}
      </p>

      <div className="mt-5 space-y-3">
        {FEEDBACK_SUPPORT_LINKS.map((item) => {
          const Icon = item.icon;
          const rowClassName =
            "group flex items-center justify-between rounded-[1.35rem] border border-rose-100 bg-white p-4 transition hover:border-rose-200 hover:shadow-sm";

          const rowContent = (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-pink-500">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[0.94rem] font-bold leading-tight text-slate-950">
                    {localize(locale, item.title)}
                  </p>
                  <p className="cmm-text-caption leading-relaxed text-slate-500">
                    {localize(locale, item.description)}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-pink-400 transition group-hover:translate-x-0.5" />
            </>
          );

          if (item.href.startsWith("mailto:")) {
            return (
              <a key={item.href} href={item.href} className={rowClassName}>
                {rowContent}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={rowClassName}>
              {rowContent}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
