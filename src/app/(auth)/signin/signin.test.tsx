// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
// next/navigation's useRouter has no provider in jsdom — stub it.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn() }),
}));
// next/link needs the App Router context; render it as a plain anchor here.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import SignInPage from "./page";

describe("SignInPage", () => {
  it("renders the title", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome back");
  });

  it("swaps the email body for the phone field when Phone is selected", () => {
    render(<SignInPage />);

    // Email is the default method: password field present, phone field absent.
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phone number")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /phone/i }));

    // Phone method: phone field present, password field gone.
    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("pushes /app when the email form is submitted", () => {
    push.mockClear();
    render(<SignInPage />);
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(push).toHaveBeenCalledWith("/app");
  });
});
