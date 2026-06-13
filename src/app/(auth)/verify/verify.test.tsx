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

  it("pushes /intent when the code is completed and Verify is clicked with flow=signup", () => {
    render(<VerifyPage />);

    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(6);
    ["5", "2", "9", "1", "0", "4"].forEach((digit, i) => {
      fireEvent.change(boxes[i], { target: { value: digit } });
    });

    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect(push).toHaveBeenCalledWith("/intent");
  });
});
