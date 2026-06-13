// src/lib/ui/mappings.test.ts
import { describe, expect, it } from "vitest";
import { GAME_BADGE, PARTICIPATION_BADGE, SKILL_UI, SPORT_UI } from "./mappings";

describe("SPORT_UI", () => {
  it("maps all 8 seeded sport keys (migrations/0001)", () => {
    expect(Object.keys(SPORT_UI).sort()).toEqual([
      "basketball",
      "football",
      "gym",
      "padel",
      "running",
      "swimming",
      "tennis",
      "volleyball",
    ]);
  });
  it("reconciles football to the soccer design key exactly once", () => {
    expect(SPORT_UI.football.className).toBe("sq-sport-soccer");
    expect(SPORT_UI.football.icon).toBe("sports_soccer");
    expect(SPORT_UI.basketball.className).toBe("sq-sport-basketball");
  });
});

describe("SKILL_UI", () => {
  it("maps the 5-tier enum to lv-1..lv-5 in order", () => {
    expect(SKILL_UI.beginner).toBe("lv-1");
    expect(SKILL_UI.professional).toBe("lv-5");
    expect(Object.keys(SKILL_UI)).toHaveLength(5);
  });
});

describe("status badges", () => {
  it("requested reads Pending — never Waitlist (v1 scope guard)", () => {
    expect(PARTICIPATION_BADGE.requested).toEqual({ className: "is-waiting", label: "Pending" });
  });
  it("covers every participation and game status", () => {
    expect(Object.keys(PARTICIPATION_BADGE).sort()).toEqual([
      "approved",
      "cancelled",
      "declined",
      "requested",
    ]);
    expect(Object.keys(GAME_BADGE).sort()).toEqual(["cancelled", "full", "open"]);
  });
});
