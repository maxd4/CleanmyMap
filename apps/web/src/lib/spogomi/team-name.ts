const MAX_SPOGOMI_TEAM_PUBLIC_NAME_LENGTH = 60;

export class SpogomiTeamNameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpogomiTeamNameValidationError";
  }
}

function hasMalformedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        index += 1;
        continue;
      }
      return true;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return true;
  }
  return false;
}

export function normalizeSpogomiTeamPublicName(value: string): string {
  if (typeof value !== "string" || hasMalformedUnicode(value)) {
    throw new SpogomiTeamNameValidationError("Validation: le pseudonyme de l’équipe contient un texte Unicode invalide.");
  }
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    throw new SpogomiTeamNameValidationError("Validation: le pseudonyme de l’équipe ne peut pas contenir de caractère de contrôle.");
  }
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!normalized) {
    throw new SpogomiTeamNameValidationError("Validation: le pseudonyme de l’équipe est obligatoire.");
  }
  if (Array.from(normalized).length > MAX_SPOGOMI_TEAM_PUBLIC_NAME_LENGTH) {
    throw new SpogomiTeamNameValidationError("Validation: le pseudonyme de l’équipe ne peut pas dépasser 60 caractères.");
  }
  return normalized;
}

export function spogomiTeamPublicNameKey(value: string): string {
  return normalizeSpogomiTeamPublicName(value).toLocaleLowerCase("fr-FR");
}

export const SPOGOMI_TEAM_PUBLIC_NAME_MAX_LENGTH = MAX_SPOGOMI_TEAM_PUBLIC_NAME_LENGTH;
