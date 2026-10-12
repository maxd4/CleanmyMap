import { describe, expect, it } from "vitest";
import {
  classifyCachanTicketDeletion,
  classifyCachanTicketStatus,
} from "./ticket-status";

describe("SPOGOMI Cachan commercial classification", () => {
  it.each([
    ["Payé", "eligible"],
    ["paid", "eligible"],
    ["registered", "eligible"],
    ["Annulé", "cancelled"],
    ["Remboursé", "cancelled"],
    ["Supprimé", "cancelled"],
    ["En attente", "pending"],
    ["", "absent"],
    [null, "absent"],
    ["Valeur inconnue", "unknown"],
  ] as const)("classifies %s as %s", (value, expected) => {
    expect(classifyCachanTicketStatus(value)).toBe(expected);
  });

  it.each([
    ["1", "deleted"],
    ["Oui", "deleted"],
    ["supprimé", "deleted"],
    ["0", "not_deleted"],
    ["Non", "not_deleted"],
    ["", "absent"],
    [null, "absent"],
    ["peut-être", "unknown"],
  ] as const)("classifies deletion %s as %s", (value, expected) => {
    expect(classifyCachanTicketDeletion(value)).toBe(expected);
  });
});
