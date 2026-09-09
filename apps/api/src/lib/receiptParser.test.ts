import { describe, expect, it } from "vitest";
import { parseReceiptText } from "./receiptParser";

describe("parseReceiptText", () => {
  it("finds the amount next to a TOTAL line", () => {
    const text = ["SUPERMERCADO LA VAQUITA", "Coca cola 2L      1.500,00", "Pan               800,00", "TOTAL   2.300,00"].join("\n");
    expect(parseReceiptText(text).amount).toBe(2300);
  });

  it("ignores subtotal, vuelto and IVA lines when a real total exists", () => {
    const text = ["Kiosco Don Pepe", "SUBTOTAL   5.000,00", "IVA   1.050,00", "TOTAL   6.050,00", "EFECTIVO   10.000,00", "VUELTO   3.950,00"].join(
      "\n"
    );
    expect(parseReceiptText(text).amount).toBe(6050);
  });

  it("falls back to the largest amount on the ticket when there's no TOTAL keyword", () => {
    const text = ["Almacén", "Fideos    450,00", "Salsa     680,00", "Queso     1.200,00"].join("\n");
    expect(parseReceiptText(text).amount).toBe(1200);
  });

  it("handles US-style decimals (comma thousands, dot decimal)", () => {
    expect(parseReceiptText("TOTAL 1,234.56").amount).toBe(1234.56);
  });

  it("handles AR-style decimals (dot thousands, comma decimal)", () => {
    expect(parseReceiptText("TOTAL 1.234,56").amount).toBe(1234.56);
  });

  it("returns null amount when there are no numbers at all", () => {
    expect(parseReceiptText("Gracias por su compra").amount).toBeNull();
  });

  it("extracts a dd/mm/yyyy date", () => {
    expect(parseReceiptText("Fecha: 09/07/2026 Hora: 14:32").expenseDate).toBe(new Date(Date.UTC(2026, 6, 9)).toISOString());
  });

  it("expands a 2-digit year to 20xx", () => {
    expect(parseReceiptText("09/07/26").expenseDate).toBe(new Date(Date.UTC(2026, 6, 9)).toISOString());
  });

  it("ignores an invalid date (bad month)", () => {
    expect(parseReceiptText("99/99/2026").expenseDate).toBeNull();
  });

  it("returns null date when there's no date-like text", () => {
    expect(parseReceiptText("TOTAL 100").expenseDate).toBeNull();
  });

  it("picks the first letter-heavy line as the merchant name", () => {
    const text = ["************", "SUPERMERCADO LA VAQUITA", "CUIT: 20-12345678-9", "TOTAL 100"].join("\n");
    expect(parseReceiptText(text).merchant).toBe("SUPERMERCADO LA VAQUITA");
  });

  it("returns null merchant when the first lines are mostly numbers/symbols", () => {
    const text = ["************", "0123456789", "98765"].join("\n");
    expect(parseReceiptText(text).merchant).toBeNull();
  });
});
