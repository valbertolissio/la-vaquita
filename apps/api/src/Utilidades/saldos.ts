import { prisma } from "../Modelo/baseDeDatos";

export interface SaldoDeParticipante {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  paid: number;
  owed: number;
  balance: number; // positivo = le deben, negativo = debe
}

/**
 * Calcula el saldo de cada participante de un viaje a partir de los gastos
 * y sus divisiones (ExpenseSplit). No se persiste: siempre se deriva en
 * tiempo real de la tabla expenses/expense_splits, que es la fuente de verdad.
 */
export async function calcularSaldos(tripId: string): Promise<SaldoDeParticipante[]> {
  const members = await prisma.participante.findMany({
    where: { tripId },
    include: { user: true },
  });

  const expenses = await prisma.gasto.findMany({
    where: { tripId },
    include: { splits: true, payers: true },
  });

  const payments = await prisma.pago.findMany({ where: { tripId } });

  const balances = new Map<string, SaldoDeParticipante>();
  for (const m of members) {
    balances.set(m.userId, {
      userId: m.userId,
      name: m.user.nickname || m.user.name,
      avatarUrl: m.user.avatarUrl,
      avatarColor: m.user.avatarColor,
      paid: 0,
      owed: 0,
      balance: 0,
    });
  }

  for (const expense of expenses) {
    for (const payer of expense.payers) {
      const p = balances.get(payer.userId);
      if (p) p.paid += Number(payer.amount);
    }

    for (const split of expense.splits) {
      const member = balances.get(split.userId);
      if (member) member.owed += Number(split.amountOwed);
    }
  }

  for (const b of balances.values()) {
    b.balance = b.paid - b.owed;
  }

  // Un pago registrado entre integrantes salda deuda por fuera de los gastos:
  // quien paga reduce lo que debe (o aumenta lo que le deben), y quien recibe
  // reduce lo que le deben (o aumenta lo que debe).
  for (const payment of payments) {
    const amount = Number(payment.amount);
    const from = balances.get(payment.fromUserId);
    const to = balances.get(payment.toUserId);
    if (from) from.balance += amount;
    if (to) to.balance -= amount;
  }

  for (const b of balances.values()) {
    b.balance = Math.round(b.balance * 100) / 100;
    b.paid = Math.round(b.paid * 100) / 100;
    b.owed = Math.round(b.owed * 100) / 100;
  }

  return Array.from(balances.values());
}

export interface PagoSugerido {
  fromUserId: string;
  fromName: string;
  fromAvatarColor: string | null;
  toUserId: string;
  toName: string;
  toAvatarColor: string | null;
  amount: number;
}

/** Algoritmo greedy: minimiza la cantidad de transferencias para saldar cuentas. */
export function simplificarDeudas(balances: SaldoDeParticipante[]): PagoSugerido[] {
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ userId: b.userId, name: b.name, avatarColor: b.avatarColor, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ userId: b.userId, name: b.name, avatarColor: b.avatarColor, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: PagoSugerido[] = [];
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
        fromAvatarColor: debtor.avatarColor,
        toUserId: creditor.userId,
        toName: creditor.name,
        toAvatarColor: creditor.avatarColor,
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
