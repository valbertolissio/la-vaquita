import { describe, expect, it } from "vitest";
import { buildEqualSplits } from "./splits";

describe("buildEqualSplits", () => {
  it("divides an amount evenly between members", () => {
    const splits = buildEqualSplits(300, ["a", "b", "c"]);
    expect(splits).toEqual([
      { userId: "a", amountOwed: 100 },
      { userId: "b", amountOwed: 100 },
      { userId: "c", amountOwed: 100 },
    ]);
  });

  it("gives the whole amount to a single member", () => {
    expect(buildEqualSplits(150.5, ["a"])).toEqual([{ userId: "a", amountOwed: 150.5 }]);
  });

  it("hands the rounding remainder to the first member when it doesn't divide evenly", () => {
    const splits = buildEqualSplits(100, ["a", "b", "c"]);
    expect(splits[1].amountOwed).toBe(33.33);
    expect(splits[2].amountOwed).toBe(33.33);
    expect(splits[0].amountOwed).toBe(33.34);
  });

  it("always sums back to the exact original amount, no matter the rounding", () => {
    for (const [amount, count] of [
      [100, 3],
      [10, 7],
      [1000.01, 6],
      [0.03, 3],
    ] as const) {
      const splits = buildEqualSplits(amount, Array.from({ length: count }, (_, i) => `user-${i}`));
      const total = Math.round(splits.reduce((s, sp) => s + sp.amountOwed, 0) * 100) / 100;
      expect(total).toBe(amount);
    }
  });
});
