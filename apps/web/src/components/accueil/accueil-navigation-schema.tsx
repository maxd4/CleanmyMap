import Image from "next/image";

export function HomeNavigationSchema() {
  return (
    <section className="relative overflow-hidden bg-transparent py-5 sm:py-7 lg:py-9">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[24rem] -translate-y-1/2 bg-[radial-gradient(ellipse_70%_45%_at_50%_50%,rgba(34,197,94,0.16),transparent_72%)]" />
      <div className="relative mx-auto w-full max-w-[1600px] px-1 sm:px-2 lg:px-4">
        <Image
          src="/homepage/schema-global-transparent.png"
          alt="Schéma global CleanMyMap présentant les parcours Agir, Déclarer une action, Comprendre, Apprendre et Rejoindre le réseau."
          width={1536}
          height={1024}
          sizes="(min-width: 1536px) 1536px, 100vw"
          className="h-auto w-full select-none object-contain"
        />
      </div>
    </section>
  );
}
