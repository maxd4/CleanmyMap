"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatUserOption = {
  id: string;
  handle: string | null;
  display_name: string | null;
};

type ParticipantPickerProps = {
  currentUserId: string;
  value: string[];
  onChange: (next: string[]) => void;
  title?: string;
  description?: string;
  className?: string;
};

function labelForUser(user: ChatUserOption | null | undefined): string {
  if (!user) {
    return "";
  }

  return user.display_name?.trim() || user.handle?.trim() || user.id;
}

export function ActionParticipantPicker({
  currentUserId,
  value,
  onChange,
  title = "Membres de l'action",
  description = "Ajoutez des comptes CleanMyMap déjà existants avant l'envoi.",
  className,
}: ParticipantPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [knownUsers, setKnownUsers] = useState<Record<string, ChatUserOption>>({});
  const hasSearchQuery = query.trim().length >= 2;

  const selectedUsers = useMemo(
    () =>
      value.map((userId) =>
        knownUsers[userId] ?? {
          id: userId,
          handle: null,
          display_name: null,
        },
      ),
    [knownUsers, value],
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return () => {
        active = false;
        controller.abort();
      };
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      fetch(`/api/chat/users?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as
            | { users?: ChatUserOption[]; error?: string }
            | null;

          if (!response.ok) {
            throw new Error(
              payload && typeof payload === "object" && payload.error
                ? payload.error
                : "La recherche de membres a échoué.",
            );
          }

          const items = Array.isArray(payload?.users) ? payload.users : [];
          if (!active) {
            return;
          }

          setResults(items);
          setKnownUsers((previous) => {
            const next = { ...previous };
            for (const item of items) {
              next[item.id] = item;
            }
            return next;
          });
        })
        .catch((fetchError) => {
          if ((fetchError as { name?: string }).name === "AbortError") {
            return;
          }
          if (!active) {
            return;
          }
          setResults([]);
          setError(
            fetchError instanceof Error && fetchError.message
              ? fetchError.message
              : "La recherche de membres a échoué.",
          );
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 260);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let active = true;
    const missingIds = value.filter((userId) => !knownUsers[userId]);

    if (missingIds.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.all(
      missingIds.slice(0, 6).map(async (userId) => {
        const response = await fetch(`/api/chat/users?q=${encodeURIComponent(userId)}`);
        if (!response.ok) {
          return null;
        }
        const payload = (await response.json()) as { users?: ChatUserOption[] };
        const match =
          payload.users?.find((candidate) => candidate.id === userId) ??
          payload.users?.[0] ??
          null;
        return match;
      }),
    )
      .then((resolved) => {
        if (!active) {
          return;
        }

        const next: Record<string, ChatUserOption> = {};
        for (const item of resolved) {
          if (item) {
            next[item.id] = item;
          }
        }

        if (Object.keys(next).length > 0) {
          setKnownUsers((previous) => ({ ...previous, ...next }));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [knownUsers, value]);

  function addUser(user: ChatUserOption) {
    if (user.id === currentUserId) {
      setMessage("Vous ne pouvez pas vous ajouter vous-même.");
      return;
    }

    if (value.includes(user.id)) {
      setMessage("Ce membre est déjà sélectionné.");
      return;
    }

    onChange([...value, user.id]);
    setKnownUsers((previous) => ({ ...previous, [user.id]: user }));
    setMessage(null);
  }

  function removeUser(userId: string) {
    onChange(value.filter((candidate) => candidate !== userId));
    setMessage(null);
  }

  return (
    <section className={cn("rounded-[1.4rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-emerald-950">{title}</h4>
            <button
              type="button"
              onClick={() => setShowHelp((current) => !current)}
              aria-label={showHelp ? "Masquer l'aide" : "Afficher l'aide"}
              aria-expanded={showHelp}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
            >
              <Info size={12} />
            </button>
          </div>
          <p className="text-xs leading-5 text-emerald-900/68">{description}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-900">
          {value.length} membre{value.length > 1 ? "s" : ""}
        </span>
      </div>

      {showHelp ? (
        <p className="mt-3 rounded-2xl border border-emerald-200/70 bg-white/90 px-3 py-2 text-xs leading-5 text-emerald-900/72">
          Recherchez un pseudo, un nom affiché ou un identifiant utilisateur. Les membres ajoutés ici sont rattachés
          directement à l&apos;action et n&apos;ont pas besoin de passer par la file de participation.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-emerald-950">Ajouter un membre</span>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/55" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pseudo, nom affiché ou ID utilisateur"
              className="w-full rounded-2xl border border-emerald-200/70 bg-white px-10 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-[#F8FCF8]"
            />
          </div>
        </label>

        {message ? (
          <p className="text-xs font-medium text-emerald-900/78" aria-live="polite">
            {message}
          </p>
        ) : null}

        {hasSearchQuery && loading ? (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-900/62">
            <Loader2 size={14} className="animate-spin text-emerald-700" />
            Recherche en cours...
          </div>
        ) : null}

        {hasSearchQuery && error ? (
          <p className="text-xs font-medium text-rose-700" aria-live="polite">
            {error}
          </p>
        ) : null}

        {hasSearchQuery && !loading && results.length === 0 && !error ? (
          <p className="text-xs font-medium text-emerald-900/60">Aucun compte trouvé.</p>
        ) : null}

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((user) => {
              const selected = value.includes(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-emerald-950">
                      {labelForUser(user)}
                    </p>
                    <p className="truncate text-xs text-emerald-900/58">
                      {user.handle ? `@${user.handle}` : user.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addUser(user)}
                    disabled={selected}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={13} />
                    {selected ? "Ajouté" : "Ajouter"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {selectedUsers.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-950">Membres sélectionnés</p>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-950"
                >
                  <span className="max-w-[13rem] truncate">{labelForUser(user)}</span>
                  <button
                    type="button"
                    onClick={() => removeUser(user.id)}
                    aria-label={`Retirer ${labelForUser(user) || user.id}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-emerald-900/58">Aucun membre ajouté pour le moment.</p>
        )}
      </div>
    </section>
  );
}
