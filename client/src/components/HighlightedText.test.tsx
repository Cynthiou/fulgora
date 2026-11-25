import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HighlightedText from "./HighlightedText";

function boldParts(container: HTMLElement): string[] {
  return [...container.querySelectorAll("strong")].map(
    (element) => element.textContent,
  );
}

describe("HighlightedText", () => {
  it("writes the term in bold, keeping the original letters", () => {
    const { container } = render(
      <HighlightedText text="Squat gobelet" term="SQUAT" />,
    );

    expect(container.textContent).toBe("Squat gobelet");
    expect(boldParts(container)).toEqual(["Squat"]);
  });

  it("ignores the accents in both directions", () => {
    const { container } = render(
      <HighlightedText text="Développé couché" term="developpe" />,
    );

    expect(boldParts(container)).toEqual(["Développé"]);
  });

  it("highlights every occurrence", () => {
    const { container } = render(
      <HighlightedText text="Curl à la barre, curl marteau" term="curl" />,
    );

    expect(boldParts(container)).toEqual(["Curl", "curl"]);
  });

  it("writes the plain text when the term is empty or absent", () => {
    const { container } = render(<HighlightedText text="Pompes" term="  " />);
    expect(boldParts(container)).toEqual([]);
    expect(container.textContent).toBe("Pompes");

    const absent = render(<HighlightedText text="Pompes" term="squat" />);
    expect(boldParts(absent.container)).toEqual([]);
    expect(absent.container.textContent).toBe("Pompes");
  });
});
