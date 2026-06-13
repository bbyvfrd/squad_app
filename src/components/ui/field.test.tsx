// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Input } from "./input";

describe("Field", () => {
  it("wires label, hint, and error to the control", () => {
    render(
      <Field label="Game title" hint="Visible to players" error="Required" name="title">
        <Input name="title" />
      </Field>,
    );
    const input = screen.getByLabelText(/Game title/);
    expect(input).toHaveAccessibleDescription(/Visible to players/);
    expect(input).toHaveAccessibleDescription(/Required/);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
