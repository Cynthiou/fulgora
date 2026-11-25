import { render, screen } from "@testing-library/react";
import { STATUS_CODES, STATUSES } from "shared";
import { describe, expect, it } from "vitest";
import StatusBadge from "../../src/components/StatusBadge";

describe("StatusBadge", () => {
  it.each(STATUS_CODES)("shows the symbol and the word for %s", (code) => {
    const { container } = render(<StatusBadge status={code} />);

    expect(container.textContent).toContain(STATUSES[code].symbol);
    expect(container.textContent).toContain(STATUSES[code].label);
  });

  it("reads as the word alone for screen readers", () => {
    render(<StatusBadge status="completed" />);

    // The symbol is decoration (aria-hidden); the accessible text is the label.
    expect(screen.getByText("Effectuée")).toBeTruthy();
  });
});
