export interface ParsedReceipt {
  amount: number | null;
  expenseDate: string | null; // ISO
  merchant: string | null;
}

const TOTAL_KEYWORDS = ["total", "importe", "a pagar", "monto"];
// Palabras que suelen aparecer junto a un número pero NO son el total del ticket.
const IGNORE_KEYWORDS = ["subtotal", "sub total", "cambio", "vuelto", "efectivo", "descuento", "iva", "cuit", "cae"];

function normalizeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (lastComma > lastDot) {
    // "1.234,56" (miles con punto, decimales con coma)
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // "1,234.56" (miles con coma, decimales con punto)
    normalized = cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

function findAllAmounts(text: string): number[] {
  const matches = text.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}|\d+/g) ?? [];
  return matches.map(normalizeAmount).filter((n): n is number => n !== null && n < 100_000_000);
}

/** Busca el monto total: primero en líneas con palabras clave ("total", "importe"...), si no el mayor número del ticket. */
function findAmount(lines: string[]): number | null {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (IGNORE_KEYWORDS.some((k) => lower.includes(k))) continue;
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      const amounts = findAllAmounts(line);
      if (amounts.length > 0) return amounts[amounts.length - 1];
    }
  }

  const relevantLines = lines.filter((l) => !IGNORE_KEYWORDS.some((k) => l.toLowerCase().includes(k)));
  const allAmounts = relevantLines.flatMap(findAllAmounts);
  if (allAmounts.length === 0) return null;
  return Math.max(...allAmounts);
}

const DATE_RE = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/;

function findDate(text: string): string | null {
  const match = text.match(DATE_RE);
  if (!match) return null;
  let [, day, month, year] = match;
  if (year.length === 2) year = `20${year}`;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function findMerchant(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, "");
    if (letters.length >= 3 && letters.length / line.length > 0.4) {
      return line.trim();
    }
  }
  return null;
}

/** Extrae monto, fecha y comercio de un texto de OCR crudo, con heurísticas simples — no es exacto, es un punto de partida para que el usuario confirme. */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    amount: findAmount(lines),
    expenseDate: findDate(rawText),
    merchant: findMerchant(lines),
  };
}
