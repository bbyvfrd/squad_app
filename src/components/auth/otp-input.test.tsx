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

  it("clears a middle cell in place without shifting the surrounding digits", () => {
    render(<Harness />);
    const boxes = screen.getAllByRole("textbox");
    ["5", "2", "9", "1", "0", "4"].forEach((digit, i) => {
      fireEvent.change(boxes[i], { target: { value: digit } });
    });

    // Empty the middle box — the fixed-length cell model keeps slot 2 blank rather
    // than pulling "1","0","4" left (the old joined-string model collapsed the gap).
    fireEvent.change(boxes[2], { target: { value: "" } });
    expect(boxes.map((b) => (b as HTMLInputElement).value)).toEqual(["5", "2", "", "1", "0", "4"]);
  });

  it("places an out-of-order digit in its own cell, not cell 0", () => {
    render(<Harness />);
    const boxes = screen.getAllByRole("textbox");

    // Type into the 4th box first: it must land in box 4, leaving the earlier
    // boxes empty (the old model packed it into box 0).
    fireEvent.change(boxes[3], { target: { value: "7" } });
    expect(boxes.map((b) => (b as HTMLInputElement).value)).toEqual(["", "", "", "7", "", ""]);
  });
});
