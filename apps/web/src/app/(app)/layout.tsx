import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { NAVIGATION_CATEGORIES } from "@/lib/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const categoryCount = NAVIGATION_CATEGORIES.length;
  const rubriqueCount = NAVIGATION_CATEGORIES.reduce((acc, category) => acc + category.items.length, 0);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">CleanMyMap</p>
          <h1 className="text-lg font-semibold text-slate-900">Espace benevole</h1>
        </div>
        <p className="text-xs text-slate-500">
          {rubriqueCount} rubriques organisees en {categoryCount} categories
        </p>
      </header>

      <AppNavigation />

      <main className="mt-4 flex-1">{children}</main>
    </div>
  );
}
