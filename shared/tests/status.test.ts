import { describe, expect, it } from "vitest";
import { formatStatus, STATUS_CODES, STATUSES } from "../status.js";

describe("STATUSES", () => {
  it("gives every status a symbol and a French label", () => {
    for (const code of STATUS_CODES) {
      expect(STATUSES[code].symbol.length).toBeGreaterThan(0);
      expect(STATUSES[code].label.length).toBeGreaterThan(0);
    }
  });

  it("uses distinct symbols so no two statuses look alike", () => {
    const symbols = STATUS_CODES.map((code) => STATUSES[code].symbol);

    expect(new Set(symbols).size).toBe(symbols.length);
  });
});

describe("formatStatus", () => {
  it("puts the symbol before the label", () => {
    expect(formatStatus("completed")).toBe("✓ Effectuée");
    expect(formatStatus("missed")).toBe("× Manquée");
    expect(formatStatus("moved")).toBe("↷ Déplacée");
  });
});
