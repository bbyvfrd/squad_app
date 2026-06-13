// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { OtpInput } from "./otp-input";

function Harness() {
  const [value, setValue] = useState("");
  return <OtpInput value={value} onChange={setValue} />;
}

describe("OtpInput", () => {
  it("fills boxes left-to-right and advances focus as digits are typed", () => {
    render(<Harness />);
    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(6);

    fireEvent.change(boxes[0], { target: { value: "5" } });
    fireEvent.change(boxes[1], { target: { value: "2" } });
    fireEvent.change(boxes[2], { target: { value: "9" } });

    expect(boxes[0]).toHaveValue("5");
    expect(boxes[1]).toHaveValue("2");
    expect(boxes[2]).toHaveValue("9");
    // after typing the 3rd digit, focus advances to the 4th box
    expect(boxes[3]).toHaveFocus();
  });
});
