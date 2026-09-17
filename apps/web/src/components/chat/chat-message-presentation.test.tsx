import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChatEmptyStateCopy } from "./chat-shell.utils";
import { ChatDegradedState, ChatEmptyState } from "./ui/chat-feed-states";

const messageItemSource = readFileSync(
  new URL("./ui/chat-message-item.tsx", import.meta.url),
  "utf8",
);

const deferredShellSource = readFileSync(
  new URL("./deferred-chat-shell.tsx", import.meta.url),
  "utf8",
);

const emptyState: ChatEmptyStateCopy = {
  title: "Aucun message",
  cardSummary: "Résumé interne",
  description: "La conversation peut commencer.",
  starterTitle: "Ancien titre conservé dans le modèle",
  starterPrompts: ["Premier sujet", "Deuxième sujet", "Troisième sujet", "À masquer"],
  purposeTags: ["À masquer"],
  messagePattern: "À masquer",
  composerHint: "À masquer",
  visibilityLabel: "À masquer",
  audienceLabel: "À masquer",
  channelGoal: "À masquer",
};

describe("Chat message presentation", () => {
  it("keeps ordinary messages free of heuristic labels and reserves cards for structured data", () => {
    expect(messageItemSource).not.toContain("isActionRelated");
    expect(messageItemSource).not.toContain("isQuestionRelated");
    expect(messageItemSource).not.toContain("Nettoyage");
    expect(messageItemSource).not.toContain("> Question");
    expect(messageItemSource).toContain("hasStructuredCard");
    expect(messageItemSource).toContain("message.message_kind");
    expect(messageItemSource).toContain("message.action_id");
  });

  it("shows a short empty state with at most three suggestions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatEmptyState, {
        emptyState,
        activeChannelType: "community",
        onStarterPrompt: vi.fn(),
        tone: "light",
      }),
    );

    expect(markup).toContain("Aucun message");
    expect(markup).toContain("Premier sujet");
    expect(markup).toContain("Troisième sujet");
    expect(markup).not.toContain("À masquer");
    expect((markup.match(/<button/g) ?? []).length).toBe(3);
  });

  it("keeps the invited discussion readable without a start CTA", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatEmptyState, {
        emptyState,
        activeChannelType: "community",
        onStarterPrompt: vi.fn(),
        isAuthenticated: false,
        tone: "light",
      }),
    );

    expect(markup).toContain("Connectez-vous pour participer à la discussion.");
    expect(markup).not.toContain("Premier sujet");
    expect(markup).not.toContain("Lancez");
    expect(markup).not.toContain("Choisir un membre");
  });

  it("does not add a second member-creation CTA to the private empty state", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatEmptyState, {
        emptyState,
        activeChannelType: "dm",
        onStarterPrompt: vi.fn(),
        isAuthenticated: true,
        tone: "light",
      }),
    );

    expect(markup).toContain("Aucun message");
    expect(markup).not.toContain("Choisir un membre");
    expect(markup).not.toContain("Premier sujet");
    expect((markup.match(/<button/g) ?? []).length).toBe(0);
  });

  it("offers a simple retry without exposing implementation details", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatDegradedState, {
        onRetry: vi.fn(),
        tone: "light",
      }),
    );

    expect(markup).toContain("Impossible de charger les messages.");
    expect(markup).toContain("Réessayer");
    expect(markup).not.toContain("F12");
    expect(markup).not.toContain("migration");
    expect(markup).not.toContain("Erreur de Flux");
  });

  it("uses a user-facing light deferred state", () => {
    expect(deferredShellSource).toContain("La conversation se prépare");
    expect(deferredShellSource).not.toContain("se charge à l");
    expect(deferredShellSource).not.toContain("Chargement du chat");
    expect(deferredShellSource).toContain("bg-rose-50/40");
  });
});
