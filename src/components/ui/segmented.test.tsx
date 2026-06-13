// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Segmented } from "./segmented";

// This repo's vitest config wires neither globals:true nor a cleanup setupFile,
// so RTL's auto-cleanup is not active. Unmount between tests so getByRole /
// getAllByRole do not match radios left over from a prior render.
afterEach(cleanup);

const OPTS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
];

describe("Segmented", () => {
  it("is a radiogroup with one tabbable item", () => {
    render(<Segmented options={OPTS} value="all" onChange={() => {}} label="When" />);
    expect(screen.getByRole("radiogroup", { name: "When" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.filter((r) => r.getAttribute("tabindex") === "0")).toHaveLength(1);
  });
  it("moves selection with ArrowRight", () => {
    const onChange = vi.fn();
    render(<Segmented options={OPTS} value="all" onChange={onChange} label="When" />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "All" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("today");
  });
});
