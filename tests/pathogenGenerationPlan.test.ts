import { describe, expect, it } from "vitest";
import {
  PATHOGEN_GENERATION_PLAN,
  PATHOGEN_GENERATION_PLAN_TOTALS,
  applyTierDifficultyFloor,
} from "../data/pathogen-generation-plan";

describe("pathogen generation plan", () => {
  it("builds separate daily and free-play quotas", () => {
    expect(PATHOGEN_GENERATION_PLAN_TOTALS.freeplay.total).toBe(2268);
    expect(PATHOGEN_GENERATION_PLAN_TOTALS.daily.total).toBe(380);
  });

  it("keeps quota difficulty counts balanced to the pool totals", () => {
    const freeplay = PATHOGEN_GENERATION_PLAN_TOTALS.freeplay.byDifficulty;
    const daily = PATHOGEN_GENERATION_PLAN_TOTALS.daily.byDifficulty;

    expect(freeplay.easy + freeplay.medium + freeplay.hard).toBe(
      PATHOGEN_GENERATION_PLAN_TOTALS.freeplay.total
    );
    expect(daily.easy + daily.medium + daily.hard).toBe(
      PATHOGEN_GENERATION_PLAN_TOTALS.daily.total
    );
  });

  it("gives core pathogens representation across all difficulties when the pool size allows it", () => {
    for (const entry of PATHOGEN_GENERATION_PLAN) {
      if (entry.tier !== "usmle_core") continue;

      if (entry.quotas.freeplay.total >= 3) {
        expect(entry.quotas.freeplay.byDifficulty.easy).toBeGreaterThan(0);
        expect(entry.quotas.freeplay.byDifficulty.medium).toBeGreaterThan(0);
        expect(entry.quotas.freeplay.byDifficulty.hard).toBeGreaterThan(0);
      }

      if (entry.quotas.daily.total >= 3) {
        expect(entry.quotas.daily.byDifficulty.easy).toBeGreaterThan(0);
        expect(entry.quotas.daily.byDifficulty.medium).toBeGreaterThan(0);
        expect(entry.quotas.daily.byDifficulty.hard).toBeGreaterThan(0);
      }
    }
  });

  it("never assigns daily quota to non-daily-eligible pathogens", () => {
    for (const entry of PATHOGEN_GENERATION_PLAN) {
      if (entry.dailyEligible) continue;
      expect(entry.quotas.daily.total).toBe(0);
      expect(entry.quotas.daily.byDifficulty.easy).toBe(0);
      expect(entry.quotas.daily.byDifficulty.medium).toBe(0);
      expect(entry.quotas.daily.byDifficulty.hard).toBe(0);
    }
  });

  it("floors difficulty upward for rarer pathogen tiers", () => {
    expect(applyTierDifficultyFloor("usmle_core", "easy")).toBe("easy");
    expect(applyTierDifficultyFloor("usmle_extended", "easy")).toBe("medium");
    expect(applyTierDifficultyFloor("rare_bonus", "easy")).toBe("hard");
    expect(applyTierDifficultyFloor("rare_bonus", "medium")).toBe("hard");
  });
});
