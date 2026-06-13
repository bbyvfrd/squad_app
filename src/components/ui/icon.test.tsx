// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon";

describe("Icon", () => {
  it("renders the ligature name inside .sq-icon with a size class", () => {
    render(<Icon name="search" size={24} />);
    const el = screen.getByText("search");
    expect(el).toHaveClass("sq-icon", "sq-icon-24");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
  it("is labelable when meaningful", () => {
    render(<Icon name="lock" label="Private game" />);
    expect(screen.getByLabelText("Private game")).toBeInTheDocument();
  });
});
