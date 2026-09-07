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
    card: "border-emerald-100/90 bg-white shadow-[0_30px_70px_-38px_rgba(16,185,129,0.42)]",
    icon: "bg-emerald-50 text-emerald-600",
    pill: "bg-emerald-50/75 hover:bg-emerald-100/90 focus-visible:ring-emerald-500",
    number: "bg-emerald-100 text-emerald-700",
    arrow: "text-emerald-600",
    audience: "border-emerald-200/75 bg-emerald-50/45 text-emerald-700",
    scene: "emerald",
  },
  violet: {
    card: "border-violet-100/90 bg-white shadow-[0_30px_70px_-38px_rgba(124,58,237,0.38)]",
    icon: "bg-violet-50 text-violet-700",
    pill: "bg-violet-50/75 hover:bg-violet-100/90 focus-visible:ring-violet-500",
    number: "bg-violet-100 text-violet-700",
    arrow: "text-violet-700",
    audience: "border-violet-200/75 bg-violet-50/45 text-violet-700",
    scene: "violet",
  },
  blue: {
    card: "border-blue-100/90 bg-white shadow-[0_30px_70px_-38px_rgba(37,99,235,0.38)]",
    icon: "bg-blue-50 text-blue-700",
    pill: "bg-blue-50/75 hover:bg-blue-100/90 focus-visible:ring-blue-500",
    number: "bg-blue-100 text-blue-700",
    arrow: "text-blue-700",
    audience: "border-blue-200/75 bg-blue-50/45 text-blue-700",
    scene: "blue",
  },
} as const;

function NavigationLandscape() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1440 1085"
      preserveAspectRatio="none"
    >
      <path
        d="M0 302c150-70 270-57 410-10 132 44 235 14 352-50 128-70 230-51 350 30 110 74 199 75 328 20v365H0Z"
        fill="#d8f8ea"
        opacity="0.62"
      />
      <path
        d="M0 390c137-38 247-20 355 28 122 54 215 51 334-19 125-73 231-64 360 12 122 72 244 71 391-24v698H0Z"
        fill="#e4f4ff"
        opacity="0.66"
      />
      <path
        d="M0 0h1440v180c-142 32-236 91-335 134-128 56-218 55-338-5-135-68-254-64-378 8-124 72-229 67-389-6Z"
        fill="#ffffff"
        opacity="0.54"
      />
      <path d="M0 960c182-34 332-10 485 30 164 44 308 54 473 13 173-43 309-45 482-5v87H0Z" fill="#d7f6e9" opacity="0.88" />
      <path d="M0 1004c170-12 319 29 465 55 176 31 326 18 492-20 183-42 317-31 483 14v32H0Z" fill="#e9f5ff" opacity="0.88" />
      <path d="M60 252c21-74 43-118 74-157 31 39 48 78 56 143-43-15-82-8-130 14Zm1280 733c21-67 43-108 73-145 27 36 43 72 50 128-43-10-79-3-123 17Z" fill="#bcefdc" opacity="0.72" />
      <path d="M45 676c18-53 31-82 52-111 21 29 32 59 38 108-31-7-59-5-90 3Zm1320-165c17-45 30-71 49-96 20 26 30 52 35 94-30-7-55-5-84 2Z" fill="#9be5c8" opacity="0.65" />
    </svg>
  );
}

function NavigationScene({ tone }: { tone: (typeof toneClasses)[NavigationPath["tone"]]["scene"] }) {
  const palette = {
    emerald: { sky: "#e3faed", hill: "#b9efd5", deep: "#56c998", accent: "#0ba76a" },
    violet: { sky: "#eeebff", hill: "#c9c0f5", deep: "#9d90e8", accent: "#6d28d9" },
    blue: { sky: "#e9f4ff", hill: "#bdd9f8", deep: "#79aeea", accent: "#1671db" },
  }[tone];

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full rounded-[1.55rem]"
      viewBox="0 0 460 220"
      preserveAspectRatio="none"
    >
      <rect width="460" height="220" fill={palette.sky} />
      <path d="M0 122c57-43 97-39 151-3 50 34 86 32 137-8 58-45 99-42 172 5v104H0Z" fill={palette.hill} opacity="0.82" />
      <path d="M0 159c58-32 98-30 151-4 57 27 95 24 143-10 61-43 104-39 166 7v68H0Z" fill={palette.deep} opacity="0.52" />
      <circle cx="86" cy="57" r="18" fill="#ffffff" opacity="0.65" />
      <circle cx="108" cy="57" r="25" fill="#ffffff" opacity="0.65" />
      <circle cx="137" cy="60" r="16" fill="#ffffff" opacity="0.65" />
      {tone === "emerald" ? (
        <>
          <path d="M64 182c0-20 5-34 14-48 9 14 14 28 14 48Zm-10 9h48v8H54Z" fill={palette.accent} opacity="0.82" />
          <path d="M310 146h63v48h-63Z M302 146l39-30 40 30Z" fill="#ffffff" opacity="0.78" />
          <path d="M327 160h12v34h-12Zm21 8h12v26h-12Z" fill={palette.accent} opacity="0.7" />
          <path d="M181 196c10-25 20-42 36-57 15 20 25 39 31 57Z" fill={palette.accent} opacity="0.75" />
          <path d="M205 170c-18-18-34-17-45-13 13 17 27 24 45 25Zm15-16c16-20 31-24 44-23-11 21-26 31-44 35Z" fill={palette.accent} opacity="0.72" />
        </>
      ) : null}
      {tone === "violet" ? (
        <>
          <path d="M0 150 83 105l74 36 72-59 80 48 78-72 73 91v71H0Z" fill={palette.deep} opacity="0.74" />
          <path d="M109 220c35-42 71-65 116-77 68-19 121-13 196 22-67 8-126 28-177 55Z" fill="#ffffff" opacity="0.72" />
          <path d="M298 98h18v68h-18Zm30-31h20v99h-20Zm33 49h18v50h-18Zm29-19h16v69h-16Z" fill={palette.accent} opacity="0.72" />
          <circle cx="67" cy="160" r="12" fill={palette.accent} opacity="0.68" />
          <circle cx="95" cy="174" r="9" fill={palette.accent} opacity="0.62" />
          <circle cx="127" cy="181" r="7" fill={palette.accent} opacity="0.58" />
        </>
      ) : null}
      {tone === "blue" ? (
        <>
          <path d="M0 172c55-26 89-27 137-7 64 26 95 18 149-18 55-37 105-34 174 3v70H0Z" fill="#ffffff" opacity="0.54" />
          <path d="M282 190h15v-42h15v42h17v-67h15v67h18v-87h16v87h18v-112h15v112h17v-135h16v135h20v30H282Z" fill={palette.accent} opacity="0.72" />
          <path d="M54 190c42-18 72-38 103-31 30 7 52 24 83 5 31-19 57-46 91-53 35-7 60-4 91 10" fill="none" stroke={palette.accent} strokeDasharray="7 9" strokeWidth="4" opacity="0.72" />
          <circle cx="54" cy="190" r="7" fill={palette.accent} /><circle cx="157" cy="159" r="7" fill={palette.accent} /><circle cx="240" cy="164" r="7" fill={palette.accent} /><circle cx="331" cy="111" r="7" fill={palette.accent} /><circle cx="423" cy="121" r="7" fill={palette.accent} />
        </>
      ) : null}
    </svg>
  );
}

function NavigationAudiences() {
  return (
    <div className="relative mx-auto mt-9 hidden h-[5.65rem] max-w-[1460px] lg:block">
      <div className="grid h-full grid-cols-[1fr_1.1fr_1fr] gap-6">
        {navigationPaths.map((path) => {
          const tone = toneClasses[path.tone];
          const Icon = path.icon;
          return (
            <div
              key={path.audience}
              className={`flex items-center justify-center gap-5 rounded-full border px-8 text-[clamp(1.15rem,1.55vw,2rem)] font-bold tracking-[-0.04em] shadow-[0_14px_32px_-24px_rgba(15,23,42,0.35)] ${tone.audience}`}
            >
              <Icon aria-hidden="true" className="size-14 shrink-0" strokeWidth={2.1} />
              <span>{path.audience}</span>
            </div>
          );
        })}
      </div>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[5.6rem] h-[13rem] w-full" viewBox="0 0 1440 208" preserveAspectRatio="none">
        <path d="M240 0v31c0 32-49 31-73 53-19 17-23 43-23 78" fill="none" stroke="#0ba76a" strokeWidth="2" />
        <circle cx="144" cy="162" r="7" fill="#0ba76a" />
        <path d="M720 0v162" fill="none" stroke="#6d28d9" strokeWidth="2" />
        <circle cx="720" cy="162" r="7" fill="#6d28d9" />
        <path d="M1200 0v31c0 32 49 31 73 53 19 17 23 43 23 78" fill="none" stroke="#1671db" strokeWidth="2" />
        <circle cx="1296" cy="162" r="7" fill="#1671db" />
      </svg>
    </div>
  );
}

function NavigationCard({ path }: { path: NavigationPath }) {
  const tone = toneClasses[path.tone];
  const Icon = path.icon;

  return (
    <article
      className={`group relative flex min-h-[39rem] min-w-0 flex-col overflow-visible rounded-[2rem] border-2 p-4 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none sm:min-h-[42rem] sm:p-5 lg:min-h-[47rem] lg:p-7 ${tone.card}`}
    >
      <div className="relative h-[12rem] shrink-0 overflow-visible rounded-[1.55rem] sm:h-[14rem] lg:h-[15rem]">
        <NavigationScene tone={tone.scene} />
        <span className={`absolute -bottom-12 left-1/2 grid size-24 -translate-x-1/2 place-items-center rounded-full border-[0.7rem] border-white ${tone.icon}`}>
          <Icon aria-hidden="true" className="size-11" strokeWidth={2.1} />
        </span>
      </div>

      <div className="relative flex flex-1 flex-col px-2 pb-4 pt-16 sm:px-3 sm:pb-5 lg:px-4 lg:pb-3 lg:pt-12">
        <p className="mb-4 text-center text-sm font-semibold tracking-tight text-slate-900 lg:hidden">
          {path.audience}
        </p>
        <h3 className="text-center text-[clamp(1.75rem,2.7vw,3.4rem)] font-black leading-[1.06] tracking-[-0.03em] text-slate-950 lg:whitespace-nowrap">
        {path.title}
        </h3>

        <nav aria-label={`Parcours ${path.audience}`} className="relative mt-7 lg:mt-7">
          <ol className="space-y-3">
          {path.links.map((item, index) => {
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={`grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold ${tone.number}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-left text-[1.35rem] font-medium tracking-[-0.03em] text-slate-900 sm:text-[1.6rem]">
                  {item.label}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={`size-6 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none ${tone.arrow}`}
                  strokeWidth={1.8}
                />
              </>
            );

            return item.external ? (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`group flex min-h-[4.25rem] items-center gap-4 rounded-full px-4 py-2.5 outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.pill}`}
                >
                  {content}
                </a>
              </li>
            ) : (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`group flex min-h-[4.25rem] items-center gap-4 rounded-full px-4 py-2.5 outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.pill}`}
                >
                  {content}
                </Link>
              </li>
            );
          })}
          </ol>
        </nav>
      </div>
    </article>
  );
}

export function HomeNavigationSchema() {
  return (
    <section
      aria-labelledby="home-navigation-title"
      className="relative isolate min-h-[112rem] w-[calc(100%_-_3px)] max-w-none overflow-hidden bg-[#fbfefd] py-12 sm:w-full sm:py-16 lg:min-h-[94rem] lg:pb-[4.5rem] lg:pt-[6.5rem]"
    >
      <NavigationLandscape />
      <div className="relative z-10 mx-auto w-full max-w-[1750px] px-4 sm:px-8 lg:px-0">
        <header className="mx-auto max-w-[1450px] text-center">
          <h2
            id="home-navigation-title"
            className="whitespace-nowrap text-[clamp(2.4rem,5.5vw,6.3rem)] font-black leading-none tracking-[-0.03em] text-slate-950"
          >
            L&apos;union fait la <span className="bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-600 bg-clip-text text-transparent">force</span>
          </h2>
          <p className="mt-5 text-[clamp(1.25rem,2.7vw,2.6rem)] leading-snug tracking-[-0.02em] text-indigo-900/75">
            Partager un moment sportif et convivial tout en agissant pour notre environnement
          </p>
        </header>

        <NavigationAudiences />

        <div className="relative mt-10 grid gap-6 sm:gap-8 lg:mt-[8.65rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-6">
          {navigationPaths.map((path) => (
            <NavigationCard key={path.audience} path={path} />
          ))}
        </div>

        <div className="relative mt-12 text-center sm:mt-14 lg:mt-[3.75rem]">
          <p className="font-[cursive] text-[clamp(2.4rem,4.7vw,4.8rem)] italic leading-none tracking-[-0.06em] text-blue-700">
            Cultivons l&apos;entraide
          </p>
          <span
            aria-hidden="true"
            className="mx-auto mt-4 block h-1.5 w-40 -rotate-3 rounded-full bg-blue-700"
          />
        </div>
      </div>
    </section>
  );
}
