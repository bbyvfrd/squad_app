import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Component tests render into a shared jsdom document; without an explicit unmount
// they leak DOM between cases (React Testing Library has no auto-cleanup unless it
// is wired here). Guarded on `document` so this is a no-op in node-environment test
// files (which have no DOM and must not load react-dom).
if (typeof document !== "undefined") {
  afterEach(async () => {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  });
}
