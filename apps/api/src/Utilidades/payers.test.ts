import { describe, expect, it } from "vitest";
import { validatePayersSum } from "./payers";

describe("validatePayersSum", () => {
  it("acepta un solo pagador que puso todo", () => {
    expect(validatePayersSum(1000, [{ userId: "a", amount: 1000 }])).toBeNull();
  });

  it("acepta varios pagadores cuando la suma da el total", () => {
    // El caso de la cena: uno puso más y el otro contribuyó.
    const payers = [
      { userId: "a", amount: 7000 },
      { userId: "b", amount: 3000 },
    ];
    expect(validatePayersSum(10000, payers)).toBeNull();
  });

  it("rechaza cuando lo que pusieron no llega al total", () => {
    const payers = [
      { userId: "a", amount: 7000 },
      { userId: "b", amount: 2000 },
    ];
    expect(validatePayersSum(10000, payers)).toMatch(/no coincide/i);
  });

  it("rechaza cuando lo que pusieron se pasa del total", () => {
    expect(validatePayersSum(100, [{ userId: "a", amount: 150 }])).toMatch(/no coincide/i);
  });

  it("tolera la diferencia de un centavo que deja el redondeo", () => {
    // 33,33 + 33,33 + 33,34 es el reparto real de 100 en tres partes.
    const payers = [
      { userId: "a", amount: 33.33 },
      { userId: "b", amount: 33.33 },
      { userId: "c", amount: 33.34 },
    ];
    expect(validatePayersSum(100, payers)).toBeNull();
  });

  it("no se confunde con la aritmética de punto flotante (0.1 + 0.2)", () => {
    const payers = [
      { userId: "a", amount: 0.1 },
      { userId: "b", amount: 0.2 },
    ];
    expect(validatePayersSum(0.3, payers)).toBeNull();
  });

  it("rechaza una lista vacía de pagadores contra un gasto con monto", () => {
    expect(validatePayersSum(500, [])).toMatch(/no coincide/i);
  });
});
