import { describe, expect, it } from "vitest";
import { leerComprobante, leerRenglones } from "./lectorDeComprobantes";

describe("parseReceiptText", () => {
  it("finds the amount next to a TOTAL line", () => {
    const text = ["SUPERMERCADO LA VAQUITA", "Coca cola 2L      1.500,00", "Pan               800,00", "TOTAL   2.300,00"].join("\n");
    expect(leerComprobante(text).amount).toBe(2300);
  });

  it("ignores subtotal, vuelto and IVA lines when a real total exists", () => {
    const text = ["Kiosco Don Pepe", "SUBTOTAL   5.000,00", "IVA   1.050,00", "TOTAL   6.050,00", "EFECTIVO   10.000,00", "VUELTO   3.950,00"].join(
      "\n"
    );
    expect(leerComprobante(text).amount).toBe(6050);
  });

  it("falls back to the largest amount on the ticket when there's no TOTAL keyword", () => {
    const text = ["Almacén", "Fideos    450,00", "Salsa     680,00", "Queso     1.200,00"].join("\n");
    expect(leerComprobante(text).amount).toBe(1200);
  });

  it("handles US-style decimals (comma thousands, dot decimal)", () => {
    expect(leerComprobante("TOTAL 1,234.56").amount).toBe(1234.56);
  });

  it("handles AR-style decimals (dot thousands, comma decimal)", () => {
    expect(leerComprobante("TOTAL 1.234,56").amount).toBe(1234.56);
  });

  it("returns null amount when there are no numbers at all", () => {
    expect(leerComprobante("Gracias por su compra").amount).toBeNull();
  });

  it("extracts a dd/mm/yyyy date", () => {
    expect(leerComprobante("Fecha: 09/07/2026 Hora: 14:32").expenseDate).toBe(new Date(Date.UTC(2026, 6, 9)).toISOString());
  });

  it("expands a 2-digit year to 20xx", () => {
    expect(leerComprobante("09/07/26").expenseDate).toBe(new Date(Date.UTC(2026, 6, 9)).toISOString());
  });

  it("ignores an invalid date (bad month)", () => {
    expect(leerComprobante("99/99/2026").expenseDate).toBeNull();
  });

  it("returns null date when there's no date-like text", () => {
    expect(leerComprobante("TOTAL 100").expenseDate).toBeNull();
  });

  it("picks the first letter-heavy line as the merchant name", () => {
    const text = ["************", "SUPERMERCADO LA VAQUITA", "CUIT: 20-12345678-9", "TOTAL 100"].join("\n");
    expect(leerComprobante(text).merchant).toBe("SUPERMERCADO LA VAQUITA");
  });

  it("returns null merchant when the first lines are mostly numbers/symbols", () => {
    const text = ["************", "0123456789", "98765"].join("\n");
    expect(leerComprobante(text).merchant).toBeNull();
  });
});

describe("parseReceiptItems", () => {
  it("extracts every product line as its own item, skipping summary lines", () => {
    const text = [
      "SUPERMERCADO LA VAQUITA",
      "Pedido Nro: 656430 08/09/2026",
      "Coca cola 2L      1.500,00",
      "Pan               800,00",
      "Queso              1.200,00",
      "Subtotal          3.500,00",
      "Total             3.500,00",
    ].join("\n");
    const items = leerRenglones(text);
    expect(items).toEqual([
      { description: "Coca Cola 2l", amount: 1500, cantidad: 1 },
      { description: "Pan", amount: 800, cantidad: 1 },
      { description: "Queso", amount: 1200, cantidad: 1 },
    ]);
  });

  it("strips a trailing quantity column before the amount", () => {
    const items = leerRenglones("CEBOLLA .N°1.. 1 18,500.00");
    expect(items).toEqual([{ description: "Cebolla", amount: 18500, cantidad: 1 }]);
  });

  it("skips lines with no letters (pure noise/symbols)", () => {
    const items = leerRenglones(["== E a —", "1.500,00 —— ——"].join("\n"));
    expect(items).toEqual([]);
  });

  it("skips lines that look like a date (pedido/fecha header)", () => {
    const items = leerRenglones("Pedido Nro: 656430 08/09/2026");
    expect(items).toEqual([]);
  });

  it("returns an empty list when there are no product lines", () => {
    expect(leerRenglones("Gracias por su compra")).toEqual([]);
  });

  it("handles a real (noisy) OCR pass over a multi-item receipt", () => {
    // Texto real capturado de tesseract.js sobre una foto de un ticket con
    // varios ítems — incluye ruido de la mesa de madera de fondo, y un ítem
    // (ANCO JOSELI) cuyo monto se perdió del todo en esta pasada.
    const text = [
      "a A A <a e UR >",
      "Pedido Nro: — 656430 08/09/2026 e =",
      "CEBOLLA .N*1.. 1 18,500.00 — ——",
      "BOLSA",
      "ANCOJOSEN — — Ii 55m",
      "BANANA ECUADOR .......P; +1 43,000.00 -—— a",
      "MAND ENCORE N? Ena 1 16,000.00 E a — Ss",
      "MAND FURE No 1 a 1 13,000.00 ==",
      "NYGRUCUA... 4 3,000.00 o",
      "PALTA. BOLSA... 1 7,500.00 <a",
      "NUEZ C/CÁASCARA. BOLS? 1 9,000.00 <<",
      "PERA JLA. N* 1... 1 23,000.00 E",
      "PIM ROJO ENC N* 3. 1 45,000.00 ——",
      "Cant Bultos: 14 =",
      "Tot Vacios: 10,000.00 <",
      "Subtotal: 236,000.00 - -",
      "Saldo Anterior: 0.00 ==",
      "Total: 236,000.00",
    ].join("\n");

    const items = leerRenglones(text);
    const amounts = items.map((i) => i.amount);

    // Los 9 ítems con un monto legible se recuperan (ANCO JOSELI se pierde en
    // esta pasada porque el OCR no le dejó ningún monto legible, y eso está
    // bien: la revisión manual del usuario es la red de seguridad, no hace
    // falta que sea perfecto).
    expect(amounts).toEqual([18500, 43000, 16000, 13000, 3000, 7500, 9000, 23000, 45000]);
    // Ninguna línea de cabecera/pie (pedido, bultos, subtotal, total, saldo) se coló como ítem.
    expect(items.some((i) => /total|bultos|vacios|pedido|saldo/i.test(i.description))).toBe(false);
  });
});

describe("ruido del OCR en tickets impresos reales", () => {
  // Texto real capturado del ticket de verduleria "BERTOLISSIO KEILA": el OCR
  // arrastra ruido del borde del papel al principio de cada renglon ("NNN.EW",
  // "AN NXXN", "RUE NS |") y en un renglon lee el monto como "$32.000.00",
  // con el punto usado a la vez de miles y de decimales.
  const TICKET = [
    "NNN.EW BANANA ECUADOR ...P/C 1 43,000.00",
    "NANI NyG RUCULA.... 4 3,000.00",
    "NN N TPERITA NORTE N* 1. 1 42,000.00",
    "NINÑES AZUCAR PACK. 1 10,500.00 >",
    "AN NXXN UVARED GLOBE BRASIL. 1 62,000.00 UN  —",
    "ON KIWI. BOLSA... 1 8,000.00 N",
    "RUE NS | PALTA.BOLSA.. 1 7,000.00 | S",
    "SN SN BATATA CAJON... 1 24,000.00 RS",
    "EEES MANZESQN1....P/CBA 1 $32.000.00 S | N",
    "AAN, NOMBLIGO ER. N* 1 1 18,500.00",
    "NN ZANAH CUBITO.... 1 11,000.00",
    "NN PAPA BLANCA MASIN .. 1 18,500.00",
    "NN PEPINO. BOLSA... 1 6,000.00",
    "Cant Bultos: 16",
    "Tot Vacios: 15,000.00",
    "Subtotal: 309,500.00",
    "Saldo Anterior: 59,600.03",
    "Total: 369,100 03",
  ].join("\n");

  it("no pierde ningun renglon y respeta el orden del ticket", () => {
    const items = leerRenglones(TICKET);
    expect(items.map((i) => i.amount)).toEqual([
      43000, 3000, 42000, 10500, 62000, 8000, 7000, 24000, 32000, 18500, 11000, 18500, 6000,
    ]);
  });

  it("saca el ruido del borde del principio de la descripcion", () => {
    const items = leerRenglones(TICKET);
    expect(items[0].description).toBe("Banana Ecuador P/c");
    expect(items[4].description).toBe("Uvared Globe Brasil");
    expect(items[6].description).toBe("Palta.bolsa");
    expect(items[10].description).toBe("Zanah Cubito");
  });

  it("no toma como item las lineas de resumen del pie", () => {
    const items = leerRenglones(TICKET);
    expect(items.some((i) => /subtotal|total|bultos|vacios|saldo/i.test(i.description))).toBe(false);
  });

  it("lee un monto con punto de miles y de decimales a la vez ($32.000.00)", () => {
    const items = leerRenglones("MANZANA ESQ N1 P/C BA 1 $32.000.00");
    expect(items[0].amount).toBe(32000);
  });

  it("lee el total aunque el OCR se coma el separador decimal", () => {
    // 369.100,03 = Subtotal 309.500,00 + Saldo anterior 59.600,03.
    expect(leerComprobante("Total: 369,100 03").amount).toBe(369100.03);
  });
});

describe("total confiable", () => {
  it("marca el total como confiable cuando sale de una linea TOTAL", () => {
    const leido = leerComprobante(["Pan 800,00", "Total: 800,00"].join("\n"));
    expect(leido.amount).toBe(800);
    expect(leido.totalConfiable).toBe(true);
  });

  it("marca el total como NO confiable cuando es solo el numero mas grande", () => {
    // Ticket sin linea de total (o con el total ilegible): el monto sugerido es
    // el mayor de los renglones, y no sirve para controlar que la suma cierre.
    const leido = leerComprobante(["Fideos 450,00", "Queso 1.200,00"].join("\n"));
    expect(leido.amount).toBe(1200);
    expect(leido.totalConfiable).toBe(false);
  });

  it("no marca nada como confiable si no hay ningun numero", () => {
    const leido = leerComprobante("Gracias por su compra");
    expect(leido.amount).toBeNull();
    expect(leido.totalConfiable).toBe(false);
  });
});

describe("montos con separadores perdidos por el OCR", () => {
  // Pasada real de tesseract sobre IMG_2475: la impresion estaba gastada y el
  // OCR devolvio la coma decimal como espacio ("43,000 00"), perdio tambien el
  // separador de miles ("18 500 00") y en un renglon dejo el numero pegado
  // ("900000"). Antes esos montos se leian como 43, 18 y se perdian renglones
  // enteros: de 14 productos entraban 3.
  const TICKET = [
    "- l - CEBOLLA No 1 1 18 500 00",
    "de ANCO JOSEL] 1 27.000 06",
    "BANANA ECUADOR — Pp, 7 43,000 00",
    "MAND ENCORE N5 7 1 16.000 00",
    "-_ MAND FURE NS 7 1 13,000.00 r +",
    "LIMON . N9 1... 1 12,000.00",
    "NyG RUCULA.... 4 3,000.00",
    "PALTA. BOLSA... 1 7,500.00",
    "NUEZ C/CASCARA. BOLS; 1 900000 N o",
    "PERA JLA. N9 4 1 23,000.00 . .",
    "PIM ROJO ENC N? 3- 1 45,000.00 \"om",
    "Cant Bultos: 14",
    "Tot Vacios: 10,000.00",
    "Subtotal: 236,000.00",
    "Saldo Anterior: 0.00",
  ].join("\n");

  it("no pierde ningun renglon aunque falten los separadores", () => {
    const items = leerRenglones(TICKET);
    expect(items.map((i) => i.amount)).toEqual([
      18500, 27000.06, 43000, 16000, 13000, 12000, 3000, 7500, 9000, 23000, 45000,
    ]);
  });

  it("no confunde la columna de cantidad con el monto", () => {
    const items = leerRenglones("- l - CEBOLLA No 1 1 18 500 00");
    expect(items).toEqual([{ description: "Cebolla", amount: 18500, cantidad: 1 }]);
  });

  it("no tira el renglon cuando el OCR dejo ilegible la descripcion", () => {
    // El nombre del producto se perdió pero el monto se lee bien: entra con un
    // nombre genérico para que el usuario lo renombre, en vez de perderse.
    expect(leerRenglones("' E 1 12,000.00 E | e |")).toEqual([{ description: "Sin descripción", amount: 12000, cantidad: 1 }]);
  });

  it("sin linea de total, el monto sugerido no se marca como confiable", () => {
    const leido = leerComprobante(TICKET);
    expect(leido.totalConfiable).toBe(false);
  });
});

describe("columnas corridas y cantidades", () => {
  it("le devuelve el importe al producto cuando cayo en el renglon de la unidad", () => {
    // Pasada real: el OCR corrio las columnas y dejo el importe de ANCO JOSELI
    // en la linea siguiente, la de la unidad. Antes entraban dos gastos mal:
    // "Anco Joseli" por 1.000 y "Bolsa" por 27.000.
    const texto = ["á ANCO JOSELI-..— —— 1 000 |", "a“ BOLSA 27,000.00 a"].join("\n");
    expect(leerRenglones(texto)).toEqual([{ description: "Anco Joseli", amount: 27000, cantidad: 1 }]);
  });

  it("no toma la columna de cantidad como si fuera un importe", () => {
    // "1 000" es la cantidad 1 mas un pedazo de numero mal leido, no mil pesos.
    expect(leerRenglones("ANCO JOSELI 1 000")).toEqual([]);
  });

  it("no toma la unidad sola como si fuera un producto", () => {
    expect(leerRenglones("BOLSA").length).toBe(0);
    expect(leerRenglones("CAJA").length).toBe(0);
  });

  it("multiplica por la cantidad cuando asi cierra con el total impreso", () => {
    const texto = ["PALTA BOLSA 1 7,500.00", "NyG RUCULA 4 3,000.00", "Total: 19,500.00"].join("\n");
    const leido = leerComprobante(texto);
    expect(leido.items).toEqual([
      { description: "Palta Bolsa", amount: 7500, cantidad: 1 },
      { description: "Rucula (x4)", amount: 12000, cantidad: 4 },
    ]);
  });

  it("no multiplica si los importes ya son el total del renglon", () => {
    const texto = ["PALTA BOLSA 1 7,500.00", "NyG RUCULA 4 3,000.00", "Total: 10,500.00"].join("\n");
    expect(leerComprobante(texto).items.map((i) => i.amount)).toEqual([7500, 3000]);
  });

  it("sin total confiable no multiplica, para no inflar un gasto", () => {
    const texto = ["PALTA BOLSA 1 7,500.00", "NyG RUCULA 4 3,000.00"].join("\n");
    expect(leerComprobante(texto).items.map((i) => i.amount)).toEqual([7500, 3000]);
  });
});
