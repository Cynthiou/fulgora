import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import NumberField from "../../src/components/NumberField";

const onError = vi.fn();

// A small host that keeps the value like the editor does.
function Host({ initial = null }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <NumberField
        id="weight"
        label="Charge (kg)"
        value={value}
        onChange={setValue}
        validate={(v) => (v !== null && v > 100 ? "Trop lourd." : null)}
        onErrorChange={onError}
        step={2.5}
        min={0}
        max={100}
        decimal
      />
      <output data-testid="value">{value === null ? "null" : value}</output>
    </>
  );
}

describe("NumberField", () => {
  it("reads a French decimal, steps with − and +, and clamps at the limits", async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByLabelText("Charge (kg)") as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("decimal");

    await user.type(input, "40,5");
    expect(screen.getByTestId("value").textContent).toBe("40.5");

    await user.click(
      screen.getByRole("button", { name: "Augmenter Charge (kg)" }),
    );
    expect(input.value).toBe("43");
    expect(screen.getByTestId("value").textContent).toBe("43");

    await user.clear(input);
    expect(screen.getByTestId("value").textContent).toBe("null");
    await user.click(
      screen.getByRole("button", { name: "Diminuer Charge (kg)" }),
    );
    expect(input.value).toBe("0");

    await user.clear(input);
    await user.type(input, "99");
    await user.click(
      screen.getByRole("button", { name: "Augmenter Charge (kg)" }),
    );
    expect(input.value).toBe("100");
  });

  it("keeps an invalid value on screen without sending it, and tells the parent", async () => {
    const user = userEvent.setup();
    onError.mockClear();
    render(<Host initial={40} />);
    const input = screen.getByLabelText("Charge (kg)") as HTMLInputElement;
    expect(input.value).toBe("40");

    await user.clear(input);
    await user.type(input, "abc");
    expect(screen.getByText("Entre un nombre.")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onError).toHaveBeenLastCalledWith("Entre un nombre.");
    // The draft kept nothing from the bad text: it was emptied by the clear.
    expect(screen.getByTestId("value").textContent).toBe("null");

    await user.clear(input);
    await user.type(input, "150");
    expect(screen.getByText("Trop lourd.")).toBeTruthy();
    // The draft kept the last valid value typed on the way ("15")
    expect(screen.getByTestId("value").textContent).toBe("15");

    await user.clear(input);
    await user.type(input, "50");
    expect(screen.queryByText("Trop lourd.")).toBeNull();
    expect(onError).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId("value").textContent).toBe("50");
  });
});
