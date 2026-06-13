// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders requested as Pending with the warning-wash class", () => {
    render(<StatusBadge kind="participation" status="requested" />);
    const el = screen.getByText("Pending");
    expect(el).toHaveClass("sq-badge", "is-waiting");
  });
  it("never renders the word Waitlist", () => {
    render(<StatusBadge kind="participation" status="requested" />);
    expect(screen.queryByText(/waitlist/i)).toBeNull();
  });
});
