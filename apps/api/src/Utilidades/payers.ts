export interface Payer {
  userId: string;
  amount: number;
}

/** Valida que la suma de lo que pagó cada persona coincida con el total del gasto (con tolerancia de redondeo de un centavo). */
export function validatePayersSum(totalAmount: number, payers: Payer[]): string | null {
  const sum = Math.round(payers.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const total = Math.round(totalAmount * 100) / 100;
  if (Math.abs(sum - total) > 0.01) {
    return `La suma de lo que pagó cada persona (${sum}) no coincide con el total del gasto (${total})`;
  }
  return null;
}
