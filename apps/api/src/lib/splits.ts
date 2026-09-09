export interface Split {
  userId: string;
  amountOwed: number;
}

/**
 * Divide un monto en partes iguales entre los integrantes dados. Como el
 * monto puede no ser divisible exacto (ej. $100 entre 3), el resto de
 * redondeo (centavos) se lo lleva el primer integrante de la lista, para que
 * la suma de las partes coincida siempre con el total exacto.
 */
export function buildEqualSplits(totalAmount: number, userIds: string[]): Split[] {
  const base = Math.floor((totalAmount / userIds.length) * 100) / 100;
  const splits = userIds.map((userId) => ({ userId, amountOwed: base }));
  const assigned = base * userIds.length;
  const remainder = Math.round((totalAmount - assigned) * 100) / 100;
  splits[0].amountOwed = Math.round((splits[0].amountOwed + remainder) * 100) / 100;
  return splits;
}
