import { describe, expect, it } from "vitest";
import { MemberBalance, simplifyDebts } from "./balances";

function balance(userId: string, balanceAmount: number): MemberBalance {
  return { userId, name: userId, avatarUrl: null, avatarColor: null, paid: 0, owed: 0, balance: balanceAmount };
}

describe("simplifyDebts", () => {
  it("suggests nothing when everyone is already even", () => {
    expect(simplifyDebts([balance("a", 0), balance("b", 0)])).toEqual([]);
  });

  it("settles a simple two-person debt directly", () => {
    const settlements = simplifyDebts([balance("a", -100), balance("b", 100)]);
    expect(settlements).toEqual([{ fromUserId: "a", fromName: "a", fromAvatarColor: null, toUserId: "b", toName: "b", toAvatarColor: null, amount: 100 }]);
  });

  it("ignores balances within the rounding threshold (a few cents)", () => {
    expect(simplifyDebts([balance("a", -0.005), balance("b", 0.005)])).toEqual([]);
  });

  it("splits one debtor's debt across multiple creditors", () => {
    const settlements = simplifyDebts([balance("a", -150), balance("b", 100), balance("c", 50)]);
    expect(settlements).toHaveLength(2);
    expect(settlements.every((s) => s.fromUserId === "a")).toBe(true);
    const total = settlements.reduce((s, x) => s + x.amount, 0);
    expect(total).toBe(150);
  });

  it("pays off one creditor using multiple debtors", () => {
    const settlements = simplifyDebts([balance("a", -60), balance("b", -40), balance("c", 100)]);
    expect(settlements).toHaveLength(2);
    expect(settlements.every((s) => s.toUserId === "c")).toBe(true);
    const total = settlements.reduce((s, x) => s + x.amount, 0);
    expect(total).toBe(100);
  });

  it("never produces more transfers than necessary (debtors + creditors - 1)", () => {
    const balances = [balance("a", -30), balance("b", -20), balance("c", -10), balance("d", 40), balance("e", 20)];
    const settlements = simplifyDebts(balances);
    // 3 deudores + 2 acreedores => a lo sumo 4 transferencias para saldar todo.
    expect(settlements.length).toBeLessThanOrEqual(4);
    const totalPaid = settlements.reduce((s, x) => s + x.amount, 0);
    expect(totalPaid).toBe(60);
  });

  it("keeps every individual balance intact across the suggested transfers", () => {
    const balances = [balance("a", -70), balance("b", -30), balance("c", 55), balance("d", 45)];
    const settlements = simplifyDebts(balances);
    for (const b of balances) {
      const sent = settlements.filter((s) => s.fromUserId === b.userId).reduce((s, x) => s + x.amount, 0);
      const received = settlements.filter((s) => s.toUserId === b.userId).reduce((s, x) => s + x.amount, 0);
      const net = Math.round((received - sent) * 100) / 100;
      expect(net).toBe(b.balance);
    }
  });
});
