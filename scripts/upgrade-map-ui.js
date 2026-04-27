const fs = require('fs');

function upgrade(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    'className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white/92 shadow-xl shadow-slate-950/10 backdrop-blur-xl"',
    'className="flex overflow-hidden rounded-2xl border cmm-border-color bg-white/80 dark:bg-slate-900/80 shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-white/95 dark:hover:bg-slate-900/95"'
  );
  content = content.replace(
    'className="w-48 px-3 py-1.5 cmm-text-caption outline-none bg-transparent"',
    'className="w-48 px-4 py-2 cmm-text-small outline-none bg-transparent cmm-text-primary placeholder:text-slate-400"'
  );
  content = content.replace(
    'className="bg-emerald-500 px-3 py-1.5 cmm-text-caption font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"',
    'className="bg-emerald-500 px-4 py-2 cmm-text-small font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"'
  );
  content = content.replace(
    'className="flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-3 py-1.5 cmm-text-caption font-bold cmm-text-secondary shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-slate-50"',
    'className="flex w-fit items-center gap-2 rounded-2xl border cmm-border-color bg-white/80 px-4 py-2 cmm-text-small font-bold cmm-text-secondary shadow-xl shadow-slate-950/10 backdrop-blur-xl transition hover:bg-white/95 hover:cmm-text-primary dark:bg-slate-900/80 dark:hover:bg-slate-900/95"'
  );
  content = content.replace(
    'className="flex w-fit items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 cmm-text-caption font-bold text-emerald-700 shadow-xl shadow-emerald-950/10 backdrop-blur-xl transition hover:bg-emerald-100"',
    'className="flex w-fit items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-2 cmm-text-small font-bold text-emerald-700 dark:text-emerald-400 shadow-xl shadow-emerald-950/10 backdrop-blur-xl transition hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60"'
  );
  content = content.replace(
    'className="min-w-[280px] max-w-[320px] space-y-3 p-1 text-left"',
    'className="min-w-[280px] max-w-[320px] space-y-4 p-2 text-left"'
  );
  content = content.replace(
    'className="space-y-1 border-b border-slate-200 pb-3"',
    'className="space-y-2 border-b cmm-border-color pb-3"'
  );
  content = content.replace(
    'className="mt-1 cmm-text-small font-bold leading-tight cmm-text-primary"',
    'className="mt-1 cmm-text-body font-bold leading-tight cmm-text-primary"'
  );
  content = content.replace(
    'className="flex flex-wrap gap-1.5 pt-1"',
    'className="flex flex-wrap gap-1.5 pt-2"'
  );
  content = content.replace(
    'className="rounded-full bg-slate-100 px-2 py-1 cmm-text-caption font-semibold cmm-text-secondary"',
    'className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 cmm-text-caption font-semibold cmm-text-secondary"'
  );
  content = content.replaceAll(
    'className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"',
    'className="rounded-xl cmm-surface-muted px-3 py-2"'
  );
  content = content.replaceAll(
    'className="rounded-xl border border-slate-200 bg-white px-3 py-2 cmm-text-caption"',
    'className="rounded-xl cmm-surface-muted px-3 py-2 cmm-text-caption"'
  );
  content = content.replace(
    'className="block w-full rounded-lg bg-slate-900 px-3 py-2.5 text-center cmm-text-caption font-bold text-white transition hover:bg-slate-800"',
    'className="block w-full rounded-xl bg-slate-900 dark:bg-emerald-600 px-3 py-3 text-center cmm-text-small font-bold text-white transition hover:bg-slate-800 dark:hover:bg-emerald-500 shadow-md"'
  );
  content = content.replace(
    'className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.65)]"',
    'className="overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-slate-950 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.45)] relative ring-1 ring-black/5"'
  );

  fs.writeFileSync(file, content);
}

upgrade('apps/web/src/components/actions/actions-map-canvas.tsx');

function upgradePage(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replaceAll(
    'group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md',
    'group cmm-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-black/40'
  );
  content = content.replaceAll(
    'className="cmm-text-caption text-emerald-600 opacity-0 group-hover:opacity-100 transition"',
    'className="cmm-text-caption text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"'
  );
  content = content.replaceAll(
    'className="mt-1 text-2xl font-bold cmm-text-primary"',
    'className="mt-2 text-3xl font-bold cmm-text-primary tracking-tight"'
  );
  content = content.replaceAll(
    'className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden"',
    'className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"'
  );
  
  content = content.replace(
    'className="rounded-2xl border border-slate-200 bg-slate-50/50 backdrop-blur-sm p-4 shadow-sm"',
    'className="cmm-card p-5"'
  );
  content = content.replace(
    'className="grid gap-4 md:grid-cols-4"',
    'className="grid gap-5 md:grid-cols-4 lg:grid-cols-[1.5fr_1.5fr_1.5fr_1.5fr_auto]"'
  );
  content = content.replaceAll(
    'className="flex flex-col gap-1.5 cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted px-1"',
    'className="flex flex-col gap-2 cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted"'
  );
  content = content.replaceAll(
    'className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-medium cmm-text-secondary outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"',
    'className="rounded-xl border cmm-border-color bg-transparent px-4 py-2.5 cmm-text-small font-medium cmm-text-primary outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"'
  );
  content = content.replace(
    'className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-bold cmm-text-secondary transition hover:bg-slate-100 hover:cmm-text-primary"',
    'className="w-full flex items-center justify-center gap-2 rounded-xl border cmm-border-color cmm-surface-muted px-4 py-2.5 cmm-text-small font-bold cmm-text-secondary transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:cmm-text-primary"'
  );
  content = content.replace(
    'className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 cmm-text-small text-emerald-950"',
    'className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 px-5 py-4 cmm-text-small text-emerald-950 dark:text-emerald-100 shadow-sm"'
  );
  content = content.replace(
    'className="inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 cmm-text-small font-semibold text-emerald-900 transition hover:bg-emerald-100"',
    'className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 cmm-text-small font-bold text-white transition hover:bg-emerald-700 shadow-sm"'
  );
  content = content.replace(
    'className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl"',
    'className="cmm-card p-4 backdrop-blur-xl"'
  );
  content = content.replace(
    'className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1"',
    'className="flex items-center gap-1 rounded-2xl border cmm-border-color cmm-surface-muted p-1"'
  );
  content = content.replace(
    'className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"',
    'className="cmm-card p-6 md:p-8"'
  );
  content = content.replace(
    'className="rounded-xl border border-sky-200 bg-sky-50 p-4"',
    'className="rounded-2xl border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/20 p-5"'
  );
  content = content.replace(
    'className="cmm-text-small text-sky-900"',
    'className="cmm-text-small text-sky-900 dark:text-sky-100"'
  );
  content = content.replace(
    'className="rounded-lg border border-sky-300 bg-white px-3 py-2 cmm-text-small font-semibold text-sky-900 transition hover:bg-sky-100"',
    'className="rounded-xl bg-sky-600 px-5 py-2.5 cmm-text-small font-bold text-white transition hover:bg-sky-700 shadow-sm"'
  );
  content = content.replace(
    'className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"',
    'className="rounded-xl border cmm-border-color cmm-surface-muted px-5 py-2.5 cmm-text-small font-bold cmm-text-secondary transition hover:cmm-text-primary hover:cmm-surface shadow-sm"'
  );
  content = content.replace(
    'className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 cmm-text-small font-semibold transition ${\n  railTab === "insights"\n  ? "bg-white cmm-text-primary shadow-sm"\n  : "cmm-text-muted hover:cmm-text-primary"\n  }`}',
    'className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 cmm-text-small font-semibold transition ${\n  railTab === "insights"\n  ? "cmm-surface cmm-text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/5"\n  : "cmm-text-muted hover:cmm-text-primary"\n  }`}'
  );
  content = content.replace(
    'className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 cmm-text-small font-semibold transition ${\n  railTab === "journal"\n  ? "bg-white cmm-text-primary shadow-sm"\n  : "cmm-text-muted hover:cmm-text-primary"\n  }`}',
    'className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 cmm-text-small font-semibold transition ${\n  railTab === "journal"\n  ? "cmm-surface cmm-text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/5"\n  : "cmm-text-muted hover:cmm-text-primary"\n  }`}'
  );

  fs.writeFileSync(file, content);
}

upgradePage('apps/web/src/app/(app)/actions/map/page.tsx');
