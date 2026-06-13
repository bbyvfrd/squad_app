// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Spots } from "./spots";

// This repo's vitest config sets neither globals:true nor a cleanup setupFile,
// so RTL's auto-cleanup is not wired. Unmount between tests so a stale prior
// render does not satisfy the document.querySelector(".sq-spots-fill") assertions.
afterEach(cleanup);

describe("Spots", () => {
  it("derives fill % and exposes a textual capacity", () => {
    render(<Spots taken={8} capacity={14} />);
    expect(screen.getByText("8/14 players")).toBeInTheDocument();
    expect(screen.getByText("6 spots left")).toBeInTheDocument();
    const fill = document.querySelector(".sq-spots-fill") as HTMLElement;
    expect(fill.style.width).toBe("57%");
    expect(fill).toHaveClass("is-open");
  });
  it("reads full at capacity", () => {
    render(<Spots taken={14} capacity={14} />);
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(document.querySelector(".sq-spots-fill")).toHaveClass("is-full");
  });
});
