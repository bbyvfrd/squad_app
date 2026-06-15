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

const signUp = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  AuthClientError: class AuthClientError extends Error {
    constructor(
      public code: string,
      public status: number,
    ) {
      super(code);
    }
  },
  authClient: { signUp: (...a: unknown[]) => signUp(...a) },
}));

import { AuthClientError } from "@/lib/auth/client";
import SignUpPage from "./page";

describe("SignUpPage", () => {
  beforeEach(() => {
    push.mockClear();
    signUp.mockReset();
  });

  it("renders the title", () => {
    render(<SignUpPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Create your account");
  });

  it("swaps the email body for the phone field when Phone is selected", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phone number")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /phone/i }));

    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("calls authClient.signUp and pushes /intent on success", async () => {
    signUp.mockResolvedValueOnce({ id: "u1", email: "a@b.co" });
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Aysel M" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/intent"));
    expect(signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "password1",
      fullName: "Aysel M",
      displayName: null,
    });
  });

  it("shows an inline error and does not navigate when signUp fails", async () => {
    signUp.mockRejectedValueOnce(new AuthClientError("EMAIL_TAKEN", 409));
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Aysel M" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already registered/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("the phone tab submit stays inert (navigates to /verify, no auth call)", () => {
    render(<SignUpPage />);
    fireEvent.click(screen.getByRole("button", { name: /phone/i }));
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));
    expect(signUp).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/verify?flow=signup");
  });
});
