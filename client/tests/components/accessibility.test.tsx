import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import EmptyState from "../../src/components/EmptyState";
import ErrorState from "../../src/components/ErrorState";
import LoadingState from "../../src/components/LoadingState";
import StatusBadge from "../../src/components/StatusBadge";

// Runs the axe accessibility audit on a rendered component.
// jsdom has no layout, so the contrast rule cannot run here: the E2E tests
// check contrast in a real browser. Page-level rules are skipped too, since
// a component alone is not a page.
async function auditA11y(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
      "page-has-heading-one": { enabled: false },
    },
  });
  return results.violations.map((violation) => violation.id);
}

describe("common components accessibility", () => {
  it("LoadingState has no violation", async () => {
    const { container } = render(<LoadingState />);

    expect(await auditA11y(container)).toEqual([]);
  });

  it("ErrorState with a retry button has no violation", async () => {
    const { container } = render(
      <ErrorState
        title="Impossible de charger tes séances"
        message="Vérifie ta connexion internet, puis réessaie."
        onRetry={() => {}}
      />,
    );

    expect(await auditA11y(container)).toEqual([]);
  });

  it("EmptyState with an action has no violation", async () => {
    const { container } = render(
      <EmptyState
        title="Aucune séance prévue"
        message="Crée ta première séance : choisis tes blocs et tes exercices."
      >
        <button type="button">Créer ma première séance</button>
      </EmptyState>,
    );

    expect(await auditA11y(container)).toEqual([]);
  });

  it("StatusBadge has no violation", async () => {
    const { container } = render(<StatusBadge status="to_confirm" />);

    expect(await auditA11y(container)).toEqual([]);
  });
});
