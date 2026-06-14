// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const signIn = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  AuthClientError: class AuthClientError extends Error {
    constructor(
      public code: string,
      public status: number,
    ) {
      super(code);
    }
  },
  authClient: { signIn: (...a: unknown[]) => signIn(...a) },
}));

import { AuthClientError } from "@/lib/auth/client";
import SignInPage from "./page";

describe("SignInPage", () => {
  beforeEach(() => {
    push.mockClear();
    signIn.mockReset();
  });

  it("renders the title", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome back");
  });

  it("swaps the email body for the phone field when Phone is selected", () => {
    render(<SignInPage />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phone number")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /phone/i }));

    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("the Forgot link points at /forgot", () => {
    render(<SignInPage />);
    expect(screen.getByRole("link", { name: /forgot/i })).toHaveAttribute("href", "/forgot");
  });

  it("calls authClient.signIn with remember and pushes /app on success", async () => {
    signIn.mockResolvedValueOnce({ id: "u2", email: "c@d.co" });
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "c@d.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app"));
    // "Stay signed in" defaults checked → remember:true forwarded.
    expect(signIn).toHaveBeenCalledWith({ email: "c@d.co", password: "password1", remember: true });
  });

  it("forwards remember:false when the toggle is turned off", async () => {
    signIn.mockResolvedValueOnce({ id: "u2", email: "c@d.co" });
    render(<SignInPage />);

    fireEvent.click(screen.getByRole("switch", { name: /stay signed in/i }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "c@d.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith({
        email: "c@d.co",
        password: "password1",
        remember: false,
      }),
    );
  });

  it("shows an inline error and does not navigate on bad credentials", async () => {
    signIn.mockRejectedValueOnce(new AuthClientError("INVALID_CREDENTIALS", 401));
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "c@d.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/email or password/i);
    expect(push).not.toHaveBeenCalled();
  });
});
