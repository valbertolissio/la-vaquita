import { describe, expect, it } from "vitest";
import { computeDurationSeconds, nextRotationCursor } from "./rotation";

describe("nextRotationCursor", () => {
  const order = ["ana", "beto", "cami"];

  it("advances to the next member in order", () => {
    expect(nextRotationCursor(order, 0)).toBe(1);
    expect(nextRotationCursor(order, 1)).toBe(2);
  });

  it("wraps around back to the first member after the last turn", () => {
    expect(nextRotationCursor(order, 2)).toBe(0);
  });

  it("wraps correctly with just two members", () => {
    const two = ["ana", "beto"];
    expect(nextRotationCursor(two, 0)).toBe(1);
    expect(nextRotationCursor(two, 1)).toBe(0);
  });
});

describe("computeDurationSeconds", () => {
  const start = new Date("2026-01-01T10:00:00.000Z");
  const completedAt = new Date("2026-01-01T10:05:30.000Z");

  it("returns null when the task doesn't use a timer", () => {
    expect(computeDurationSeconds(false, start, completedAt)).toBeNull();
  });

  it("returns null when the task never started", () => {
    expect(computeDurationSeconds(true, null, completedAt)).toBeNull();
  });

  it("computes the elapsed seconds between start and completion", () => {
    expect(computeDurationSeconds(true, start, completedAt)).toBe(330);
  });

  it("never returns a negative duration, even with clock skew", () => {
    const before = new Date("2026-01-01T09:59:00.000Z");
    expect(computeDurationSeconds(true, start, before)).toBe(0);
  });
});
