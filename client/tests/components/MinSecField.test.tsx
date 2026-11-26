import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { getDurationInput } from "shared";
import { describe, expect, it } from "vitest";
import MinSecField from "../../src/components/MinSecField";

// A small host that keeps the value in seconds, like the editor does.
function Host({ profile }: { profile: "cardio" | "duration" }) {
  const [value, setValue] = useState<number | null>(null);
  const durationInput = getDurationInput(profile);
  return (
    <>
      <MinSecField
        id="duration"
        label="Durée"
        value={value}
        onChange={setValue}
        validate={() => null}
        bareUnit={durationInput.bareUnit}
        step={durationInput.step}
        placeholder={durationInput.placeholder}
        max={24 * 60 * 60}
      />
      <output data-testid="value">{value === null ? "null" : value}</output>
    </>
  );
}

describe("MinSecField (RM-083)", () => {
  it("reads a plain number as minutes in cardio, and steps by one minute", async () => {
    const user = userEvent.setup();
    render(<Host profile="cardio" />);
    const input = screen.getByLabelText("Durée") as HTMLInputElement;
    expect(input.placeholder).toBe("ex. 30:00");

    await user.type(input, "30");
    expect(screen.getByTestId("value").textContent).toBe("1800");
    // The typed text stays as it is while the value matches it
    expect(input.value).toBe("30");

    await user.click(screen.getByRole("button", { name: "Augmenter Durée" }));
    expect(screen.getByTestId("value").textContent).toBe("1860");
    expect(input.value).toBe("31:00");
  });

  it("keeps seconds for a plank, and steps by 15 s", async () => {
    const user = userEvent.setup();
    render(<Host profile="duration" />);
    const input = screen.getByLabelText("Durée") as HTMLInputElement;
    expect(input.placeholder).toBe("ex. 0:45");

    await user.type(input, "45");
    expect(screen.getByTestId("value").textContent).toBe("45");

    await user.click(screen.getByRole("button", { name: "Augmenter Durée" }));
    expect(screen.getByTestId("value").textContent).toBe("60");
    expect(input.value).toBe("1:00");
  });

  it("reads min:s the same way everywhere", async () => {
    const user = userEvent.setup();
    render(<Host profile="cardio" />);
    await user.type(screen.getByLabelText("Durée"), "1:30");
    expect(screen.getByTestId("value").textContent).toBe("90");
  });
});
