import { isSafeChatAttachmentUrl } from "./chat-attachments";

export type ChatContentPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const CHAT_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function countCharacter(value: string, character: string): number {
  return [...value].filter((item) => item === character).length;
}

function splitTrailingUrlPunctuation(value: string): {
  url: string;
  punctuation: string;
} {
  let url = value;
  let punctuation = "";

  while (/[.,!?;:]+$/.test(url)) {
    punctuation = `${url.slice(-1)}${punctuation}`;
    url = url.slice(0, -1);
  }

  const pairs: Array<[string, string]> = [
    [")", "("],
    ["]", "["],
    ["}", "{"],
  ];
  for (const [closing, opening] of pairs) {
    while (
      url.endsWith(closing) &&
      countCharacter(url, closing) > countCharacter(url, opening)
    ) {
      punctuation = `${url.slice(-1)}${punctuation}`;
      url = url.slice(0, -1);
    }
  }

  return { url, punctuation };
}

export function parseChatContentLinks(content: string): ChatContentPart[] {
  const parts: ChatContentPart[] = [];
  let cursor = 0;
  const pushText = (value: string) => {
    if (!value) {
      return;
    }
    const previous = parts.at(-1);
    if (previous?.type === "text") {
      previous.value += value;
      return;
    }
    parts.push({ type: "text", value });
  };

  for (const match of content.matchAll(CHAT_URL_PATTERN)) {
    const candidate = match[0];
    const start = match.index ?? 0;
    const { url, punctuation } = splitTrailingUrlPunctuation(candidate);

    if (!url || !isSafeChatAttachmentUrl(url)) {
      continue;
    }

    if (start > cursor) {
      pushText(content.slice(cursor, start));
    }
    parts.push({ type: "link", value: url, href: url });
    if (punctuation) {
      pushText(punctuation);
    }
    cursor = start + candidate.length;
  }

  if (cursor < content.length) {
    pushText(content.slice(cursor));
  }

  return parts;
}
