import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  applyCorrectGuess,
  clearCurrentFreeplayCaseId,
  clearGameState,
  createInitialState,
  freeplaylKey,
  getCompletedFreeplayCaseIds,
  getCurrentFreeplayCaseId,
  getFreeplayStreak,
  markResultSeen,
  resetFreeplayProgress,
  setCurrentFreeplayCaseId,
  setFreeplayStreak,
  saveGameState,
} from "../lib/gameState";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }
}

describe("free play progress helpers", () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
    storage.clear();
  });

  afterEach(() => {
    storage.clear();
  });

  it("returns only completed free-play case ids", () => {
    const wonCase = applyCorrectGuess(
      createInitialState("case-a", "freeplay"),
      "Staphylococcus aureus"
    );
    const activeCase = createInitialState("case-b", "freeplay");

    saveGameState(freeplaylKey("case-a"), wonCase);
    saveGameState(freeplaylKey("case-b"), activeCase);

    expect(getCompletedFreeplayCaseIds(["case-a", "case-b", "case-c"])).toEqual([
      "case-a",
    ]);
  });

  it("removes saved free-play progress for all provided cases", () => {
    const completed = applyCorrectGuess(
      createInitialState("case-a", "freeplay"),
      "Staphylococcus aureus"
    );
    saveGameState(freeplaylKey("case-a"), completed);
    saveGameState(freeplaylKey("case-b"), createInitialState("case-b", "freeplay"));

    resetFreeplayProgress(["case-a", "case-b"]);

    expect(storage.getItem(freeplaylKey("case-a"))).toBeNull();
    expect(storage.getItem(freeplaylKey("case-b"))).toBeNull();
  });

  it("clears a single saved game state", () => {
    const active = createInitialState("case-a", "freeplay");
    saveGameState(freeplaylKey("case-a"), active);

    clearGameState(freeplaylKey("case-a"));

    expect(storage.getItem(freeplaylKey("case-a"))).toBeNull();
  });

  it("marks a completed result as already seen without altering gameplay state", () => {
    const completed = applyCorrectGuess(
      createInitialState("case-a", "daily", "2026-03-27"),
      "Staphylococcus aureus"
    );

    const seen = markResultSeen(completed);

    expect(seen.status).toBe("won");
    expect(seen.guesses).toEqual(completed.guesses);
    expect(seen.resultSeenAt).toBeTypeOf("string");
    expect(markResultSeen(seen)).toEqual(seen);
  });

  it("resets the persisted free-play streak when free-play progress is cleared", () => {
    setFreeplayStreak(4);

    resetFreeplayProgress(["case-a"]);

    expect(getFreeplayStreak()).toBe(0);
  });

  it("stores and clears the current free-play case id", () => {
    setCurrentFreeplayCaseId("case-a");
    expect(getCurrentFreeplayCaseId()).toBe("case-a");

    clearCurrentFreeplayCaseId();
    expect(getCurrentFreeplayCaseId()).toBeNull();
  });

  it("clears the current free-play case id when free-play progress is reset", () => {
    setCurrentFreeplayCaseId("case-a");

    resetFreeplayProgress(["case-a"]);

    expect(getCurrentFreeplayCaseId()).toBeNull();
  });
});
