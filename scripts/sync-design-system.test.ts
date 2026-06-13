// scripts/sync-design-system.test.ts
import { describe, expect, it } from "vitest";
import { stripFontFaces } from "./sync-design-system.mjs";

describe("stripFontFaces", () => {
  it("removes every @font-face block and nothing else", () => {
    const css = `/* head */\n@font-face {\n  font-family: 'X';\n  src: url('fonts/x.woff2');\n}\n:root {\n  --terra-500: #EE4721;\n}\n@font-face { font-family: 'Y'; }\n.sq-btn { color: var(--terra-500); }\n`;
    const out = stripFontFaces(css);
    expect(out).not.toContain("@font-face");
    expect(out).not.toContain("fonts/x.woff2");
    expect(out).toContain("--terra-500: #EE4721;");
    expect(out).toContain(".sq-btn { color: var(--terra-500); }");
  });
});
