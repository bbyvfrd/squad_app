// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("renders a plain div by default", () => {
    render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId("c").tagName).toBe("DIV");
    expect(screen.getByTestId("c")).toHaveClass("sq-card");
  });
  it("renders interactive cards as a link (focusable)", () => {
    render(<Card href="/app/games/1">Game</Card>);
    const a = screen.getByRole("link", { name: "Game" });
    expect(a).toHaveClass("sq-card", "is-interactive");
  });
  it("renders interactive cards as a button when given onClick", () => {
    render(<Card onClick={() => {}}>Open</Card>);
    expect(screen.getByRole("button", { name: "Open" })).toHaveClass("is-interactive");
  });
});
