import { describe, expect, it } from "vitest";
import { calcularDuracionEnSegundos, siguienteTurno } from "./turnos";

describe("nextRotationCursor", () => {
  const order = ["ana", "beto", "cami"];

  it("advances to the next member in order", () => {
    expect(siguienteTurno(order, 0)).toBe(1);
    expect(siguienteTurno(order, 1)).toBe(2);
  });

  it("wraps around back to the first member after the last turn", () => {
    expect(siguienteTurno(order, 2)).toBe(0);
  });

  it("wraps correctly with just two members", () => {
    const two = ["ana", "beto"];
    expect(siguienteTurno(two, 0)).toBe(1);
    expect(siguienteTurno(two, 1)).toBe(0);
  });
});

describe("computeDurationSeconds", () => {
  const start = new Date("2026-01-01T10:00:00.000Z");
  const completedAt = new Date("2026-01-01T10:05:30.000Z");

  it("returns null when the task never started", () => {
    expect(calcularDuracionEnSegundos(null, completedAt)).toBeNull();
  });

  it("computes the elapsed seconds between start and completion", () => {
    expect(calcularDuracionEnSegundos(start, completedAt)).toBe(330);
  });

  it("works the same for a manually-scheduled task, not just ones with a cronómetro", () => {
    expect(calcularDuracionEnSegundos(start, completedAt)).toBe(330);
  });

  it("never returns a negative duration, even with clock skew", () => {
    const before = new Date("2026-01-01T09:59:00.000Z");
    expect(calcularDuracionEnSegundos(start, before)).toBe(0);
  });

  it("ignores a scheduled date range instead of logging it as worked time", () => {
    // "Alimentar al perro": inicio hoy, fin dentro de diez años. Eso es una
    // fecha agendada, no diez años de trabajo.
    const dentroDeDiezAnios = new Date("2036-01-01T10:00:00.000Z");
    expect(calcularDuracionEnSegundos(start, dentroDeDiezAnios)).toBeNull();
  });

  it("ignores a turn that stayed pending for days", () => {
    const tresDiasDespues = new Date("2026-01-04T10:00:00.000Z");
    expect(calcularDuracionEnSegundos(start, tresDiasDespues)).toBeNull();
  });

  it("still measures a long but plausible stretch of work (24 h)", () => {
    const unDiaDespues = new Date("2026-01-02T10:00:00.000Z");
    expect(calcularDuracionEnSegundos(start, unDiaDespues)).toBe(86400);
  });
});
