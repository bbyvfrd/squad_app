// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuField } from "./auth-field";

describe("AuField", () => {
  it("renders its label and a real input", () => {
    render(<AuField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("calls onChange with the typed value", () => {
    const onChange = vi.fn();
    render(<AuField label="Email" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    expect(onChange).toHaveBeenCalledWith("a@b.co");
  });
});
