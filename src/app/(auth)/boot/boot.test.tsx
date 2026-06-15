// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const session = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  authClient: { session: () => session() },
}));

import BootPage from "./page";

describe("BootPage", () => {
  beforeEach(() => {
    replace.mockClear();
    session.mockReset();
  });

  it("shows the warming-up eyebrow while probing", () => {
    session.mockReturnValue(new Promise(() => {})); // never resolves
    render(<BootPage />);
    expect(screen.getByText("Warming up the pitch")).toBeInTheDocument();
  });

  it("replaces to /app when a session is present", async () => {
    session.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
    render(<BootPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
  });

  it("replaces to /welcome when there is no session", async () => {
    session.mockResolvedValueOnce(null);
    render(<BootPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome"));
  });

  it("falls back to /welcome if the probe throws", async () => {
    session.mockRejectedValueOnce(new Error("network"));
    render(<BootPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome"));
  });
});
