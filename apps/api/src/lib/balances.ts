import { prisma } from "./prisma";

export interface MemberBalance {
  userId: string;
  name: string;
  avatarUrl: string | null;
  paid: number;
  owed: number;
  balance: number; // positivo = le deben, negativo = debe
}

/**
 * Calcula el saldo de cada participante de un viaje a partir de los gastos
 * y sus divisiones (ExpenseSplit). No se persiste: siempre se deriva en
 * tiempo real de la tabla expenses/expense_splits, que es la fuente de verdad.
 */
export async function computeTripBalances(tripId: string): Promise<MemberBalance[]> {
  const members = await prisma.tripMember.findMany({
    where: { tripId },
    include: { user: true },
  });

  const expenses = await prisma.expense.findMany({
    where: { tripId },
    include: { splits: true },
  });

  const balances = new Map<string, MemberBalance>();
  for (const m of members) {
    balances.set(m.userId, {
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      paid: 0,
      owed: 0,
      balance: 0,
    });
  }

  for (const expense of expenses) {
    const payer = balances.get(expense.paidById);
    if (payer) payer.paid += Number(expense.amount);

    for (const split of expense.splits) {
      const member = balances.get(split.userId);
      if (member) member.owed += Number(split.amountOwed);
    }
  }

  for (const b of balances.values()) {
    b.balance = Math.round((b.paid - b.owed) * 100) / 100;
    b.paid = Math.round(b.paid * 100) / 100;
    b.owed = Math.round(b.owed * 100) / 100;
  }

  return Array.from(balances.values());
}

export interface Settlement {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

/** Algoritmo greedy: minimiza la cantidad de transferencias para saldar cuentas. */
export function simplifyDebts(balances: MemberBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ userId: b.userId, name: b.name, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ userId: b.userId, name: b.name, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (amount > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.01) i++;
    if (creditor.amount <= 0.01) j++;
  }

  return settlements;
}
