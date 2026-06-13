// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const back = vi.fn();
// `?flow=signup` so Verify is expected to route to /intent.
const searchParams = new URLSearchParams("flow=signup");
// next/navigation has no provider in jsdom — stub the router + search params.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  useSearchParams: () => searchParams,
}));

import VerifyPage from "./page";

describe("VerifyPage", () => {
  beforeEach(() => {
    // The resend countdown runs on setInterval; fake timers keep it deterministic.
    vi.useFakeTimers();
    push.mockClear();
    back.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the title", () => {
    render(<VerifyPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Enter the code");
  });

  it("keeps Verify disabled until all six digits are entered, then pushes /intent (flow=signup)", () => {
    render(<VerifyPage />);

    const verifyBtn = screen.getByRole("button", { name: /verify/i });
    // Gated up front: no code yet.
    expect(verifyBtn).toBeDisabled();

    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(6);

    // Five digits is still incomplete — the CTA stays disabled and clicking is a no-op.
    ["5", "2", "9", "1", "0"].forEach((digit, i) => {
      fireEvent.change(boxes[i], { target: { value: digit } });
    });
    expect(verifyBtn).toBeDisabled();
    fireEvent.click(verifyBtn);
    expect(push).not.toHaveBeenCalled();

    // Sixth digit completes the code: the CTA enables and routes by flow.
    fireEvent.change(boxes[5], { target: { value: "4" } });
    expect(verifyBtn).toBeEnabled();
    fireEvent.click(verifyBtn);
    expect(push).toHaveBeenCalledWith("/intent");
  });

  it("clearing a middle digit does not shift the others and re-gates Verify", () => {
    render(<VerifyPage />);

    const boxes = screen.getAllByRole("textbox");
    ["5", "2", "9", "1", "0", "4"].forEach((digit, i) => {
      fireEvent.change(boxes[i], { target: { value: digit } });
    });
    expect(screen.getByRole("button", { name: /verify/i })).toBeEnabled();

    // Clear the 3rd box: the "9" slot becomes empty in place — 5,2,_,1,0,4 — and the
    // surrounding digits keep their positions (the old joined-string model shifted them).
    fireEvent.change(boxes[2], { target: { value: "" } });
    expect(boxes[0]).toHaveValue("5");
    expect(boxes[1]).toHaveValue("2");
    expect(boxes[2]).toHaveValue("");
    expect(boxes[3]).toHaveValue("1");
    expect(boxes[4]).toHaveValue("0");
    expect(boxes[5]).toHaveValue("4");
    // An interior gap is incomplete, so Verify gates again.
    expect(screen.getByRole("button", { name: /verify/i })).toBeDisabled();
  });
});
