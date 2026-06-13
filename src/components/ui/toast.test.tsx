// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast } from "./toast";

// This repo wires neither globals:true nor a cleanup setupFile, so RTL's
// auto-cleanup is off. The toast store is module-level singleton state, so a
// queued toast would otherwise leak across cases. We use fake timers and flush
// the 5000ms auto-dismiss after each test to drain the queue back to empty,
// then unmount. This keeps the cases order-independent.
afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  cleanup();
  vi.useRealTimers();
});

describe("toast", () => {
  it("renders queued toasts in an aria-live region", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ message: "Spot confirmed", variant: "success" });
    });
    expect(screen.getByText("Spot confirmed")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("auto-dismisses a toast after its timeout", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ message: "Request sent", variant: "info" });
    });
    expect(screen.getByText("Request sent")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
  });

  it("starts empty (store is reset between cases)", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    expect(screen.queryByText("Spot confirmed")).not.toBeInTheDocument();
    expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
  });

  it("renders an action button that dismisses on click", () => {
    vi.useFakeTimers();
    const onAction = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ message: "2 spots left", variant: "warning", actionLabel: "View", onAction });
    });
    const action = screen.getByRole("button", { name: "View" });
    act(() => {
      fireEvent.click(action);
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("2 spots left")).not.toBeInTheDocument();
  });
});
