// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MethodTabs } from "./method-tabs";

describe("MethodTabs", () => {
  it("marks the active method and reflects it with aria-pressed", () => {
    render(<MethodTabs value="email" onChange={() => {}} />);
    const email = screen.getByRole("button", { name: /email/i });
    expect(email).toHaveClass("is-active");
    expect(email).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /phone/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange and activates Phone when clicked", () => {
    const onChange = vi.fn();
    render(<MethodTabs value="email" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /phone/i }));
    expect(onChange).toHaveBeenCalledWith("phone");
  });
});
