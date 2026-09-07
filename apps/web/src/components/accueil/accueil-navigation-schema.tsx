import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Database, Leaf, UsersRound } from "lucide-react";

type NavigationLink = {
  label: string;
  href: string;
  external?: boolean;
};

type NavigationPath = {
  audience: string;
  title: string;
  icon: LucideIcon;
  tone: "green" | "violet" | "blue";
  links: NavigationLink[];
};

const navigationPaths: NavigationPath[] = [
  {
    audience: "Éco-citoyen",
    title: "Repérer, Agir, Discuter",
    icon: Leaf,
    tone: "green",
    links: [
      { label: "Visualiser", href: "/actions/map" },
      { label: "Agir", href: "/actions/new" },
      { label: "Apprendre", href: "/learn/comprendre" },
      { label: "Groupes locaux", href: "/sections/messagerie" },
    ],
  },
  {
    audience: "Association / Entreprise",
    title: "Préparer, Mobiliser, Impacter",
    icon: UsersRound,
    tone: "violet",
    links: [
      { label: "Itinéraire", href: "/sections/route" },
      {
        label: "Formulaire de groupe",
        href: "/sections/rejoindre-un-formulaire",
      },
      { label: "Partager l'action", href: "/sections/community" },
      { label: "Fédérer", href: "/sections/actors" },
    ],
  },
  {
    audience: "Scientifique / Développeur",
    title: "Sciences Participatives",
    icon: Database,
    tone: "blue",
    links: [
      { label: "Méthodologie", href: "/methodologie" },
      { label: "Open Data", href: "/sections/open-data" },
      { label: "Feedback", href: "/sections/feedback" },
      {
        label: "Github",
        href: "https://github.com/maxd4/CleanMyMap",
        external: true,
      },
    ],
  },
];

const toneClasses = {
  green: {
    card: "border-emerald-200/80 bg-gradient-to-b from-white via-emerald-50/80 to-emerald-100/70",
    icon: "bg-emerald-100 text-emerald-600",
    pill: "bg-emerald-50/90 hover:bg-emerald-100/90 focus-visible:ring-emerald-500",
    number: "bg-emerald-100 text-emerald-700",
    arrow: "text-emerald-600",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-b from-white via-violet-50/80 to-violet-100/75",
    icon: "bg-violet-100 text-violet-700",
    pill: "bg-violet-50/90 hover:bg-violet-100/90 focus-visible:ring-violet-500",
    number: "bg-violet-100 text-violet-700",
    arrow: "text-violet-700",
  },
  blue: {
    card: "border-blue-200/80 bg-gradient-to-b from-white via-blue-50/80 to-blue-100/75",
    icon: "bg-blue-100 text-blue-700",
    pill: "bg-blue-50/90 hover:bg-blue-100/90 focus-visible:ring-blue-500",
    number: "bg-blue-100 text-blue-700",
    arrow: "text-blue-700",
  },
} as const;

function NavigationLandscape() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[18rem] w-full text-emerald-100/70 sm:h-[23rem]"
      viewBox="0 0 1440 360"
      preserveAspectRatio="none"
    >
      <path
        d="M0 226c118-36 190-44 310-8 115 35 176 8 274-29 113-43 208-31 315 18 103 48 200 53 311 4 93-41 155-35 230-12v161H0Z"
        fill="currentColor"
      />
      <path
        d="M0 292c136-44 236-25 351 8 104 29 202 12 306-27 103-38 218-26 315 13 113 45 229 39 337-2 54-20 91-26 131-27v103H0Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M88 260c18-58 29-91 49-126 20 35 31 68 35 126Zm22-126c17-17 34-27 54-33-7 24-24 41-54 57Zm1192 143c16-41 26-67 45-96 19 29 29 55 34 96Zm12-96c17-16 32-24 50-30-6 22-22 37-50 51Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function NavigationCard({ path }: { path: NavigationPath }) {
  const tone = toneClasses[path.tone];
  const Icon = path.icon;

  return (
    <article
      className={`relative flex min-h-[27rem] flex-col overflow-hidden rounded-[2rem] border p-5 shadow-[0_22px_55px_-34px_rgba(15,23,42,0.35)] transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none sm:p-6 lg:min-h-[36rem] ${tone.card}`}
    >
      <div className="relative flex items-center justify-center gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-full ${tone.icon}`}
        >
          <Icon aria-hidden="true" className="size-6" strokeWidth={2.2} />
        </span>
        <p className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
          {path.audience}
        </p>
      </div>

      <h3 className="relative mt-7 text-center text-[clamp(1.6rem,2.4vw,2.2rem)] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 lg:whitespace-nowrap lg:text-[clamp(1rem,1.35vw,1.75rem)]">
        {path.title}
      </h3>

      <nav aria-label={`Parcours ${path.audience}`} className="relative mt-7">
        <ol className="space-y-2.5">
          {path.links.map((item, index) => {
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${tone.number}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-left text-[1.05rem] font-medium text-slate-900 sm:text-lg">
                  {item.label}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={`size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none ${tone.arrow}`}
                  strokeWidth={2}
                />
              </>
            );

            return item.external ? (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`group flex min-h-12 items-center gap-3 rounded-full px-3 py-2.5 outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.pill}`}
                >
                  {content}
                </a>
              </li>
            ) : (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`group flex min-h-12 items-center gap-3 rounded-full px-3 py-2.5 outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.pill}`}
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </article>
  );
}

export function HomeNavigationSchema() {
  return (
    <section
      aria-labelledby="home-navigation-title"
      className="relative isolate w-[calc(100%_-_3px)] max-w-none overflow-hidden bg-white/70 py-12 sm:w-full sm:py-16 lg:py-20"
    >
      <NavigationLandscape />
      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-4 sm:px-8 lg:px-12">
        <header className="mx-auto max-w-5xl text-center">
          <h2
            id="home-navigation-title"
            className="whitespace-nowrap text-[clamp(1.8rem,5vw,4.75rem)] font-black leading-none tracking-[-0.065em] text-slate-950"
          >
            L&apos;union fait la <span className="text-cyan-600">force</span>
          </h2>
          <p className="mt-4 text-[clamp(1.05rem,2vw,1.55rem)] leading-snug tracking-[-0.02em] text-indigo-900/75">
            Partager un moment sportif et convivial tout en agissant pour notre environnement
          </p>
        </header>

        <div className="relative mt-10 grid gap-5 lg:grid-cols-3 lg:gap-6 xl:gap-8">
          {navigationPaths.map((path) => (
            <NavigationCard key={path.audience} path={path} />
          ))}
        </div>

        <div className="relative mt-10 text-center sm:mt-14">
          <p className="font-serif text-[clamp(2rem,4vw,3.7rem)] italic leading-none tracking-[-0.05em] text-blue-700">
            Cultivons l&apos;entraide
          </p>
          <span
            aria-hidden="true"
            className="mx-auto mt-3 block h-1 w-28 -rotate-3 rounded-full bg-blue-700"
          />
        </div>
      </div>
    </section>
  );
}
