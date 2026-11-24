import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("displays the main title", () => {
    render(<HomePage />);

    const title = screen.getByRole("heading", { level: 1 });

    expect(title.textContent).toBe("Ton carnet d'entraînement");
  });
});
