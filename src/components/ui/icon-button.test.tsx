// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("requires and applies an accessible name", () => {
    render(<IconButton icon="tune" label="Filters" />);
    expect(screen.getByRole("button", { name: "Filters" })).toHaveClass("sq-iconbtn");
  });
});
