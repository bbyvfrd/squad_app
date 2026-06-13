// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("composes variant and size classes and defaults type=button", () => {
    render(
      <Button variant="primary" size="sm">
        Request spot
      </Button>,
    );
    const b = screen.getByRole("button", { name: "Request spot" });
    expect(b).toHaveClass("sq-btn", "sq-btn-primary", "sq-btn-sm");
    expect(b).toHaveAttribute("type", "button");
  });
});
