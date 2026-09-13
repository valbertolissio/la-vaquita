export interface RenglonDeComprobante {
  description: string;
  /** Lo que cuesta el renglón entero (ya multiplicado por la cantidad). */
  amount: number;
  /** Cuántas unidades se llevaron de ese producto. */
  cantidad: number;
}

export interface ComprobanteLeido {
  amount: number | null;
  expenseDate: string | null; // ISO
  merchant: string | null;
  items: RenglonDeComprobante[];
  /**
   * true solo si el monto salió de una línea que dice "TOTAL" (o similar).
   * Cuando es false, `amount` es apenas el número más grande que se encontró:
   * sirve como sugerencia para el formulario, pero NO se puede usar para
   * controlar que la suma de los ítems cierre, porque no es el total real.
   */
  totalConfiable: boolean;
}

const TOTAL_KEYWORDS = ["total", "importe", "a pagar", "monto"];
// Palabras que suelen aparecer junto a un número pero NO son el total del ticket.
const IGNORE_KEYWORDS = ["subtotal", "sub total", "cambio", "vuelto", "efectivo", "descuento", "iva", "cuit", "cae"];
// Líneas que son cabecera/pie del ticket (no un producto) aunque tengan un
// número con pinta de monto — para no proponerlas como "ítem" en la carga
// itemizada.
const SUMMARY_LINE_KEYWORDS = [
  ...TOTAL_KEYWORDS,
  ...IGNORE_KEYWORDS,
  "pedido",
  "vendedor",
  "bultos",
  "vacios",
  "vacíos",
  "saldo anterior",
];

/**
 * Convierte el texto de un monto en número.
 *
 * El punto, la coma y el ESPACIO se tratan igual, porque en una foto de un
 * ticket impreso el OCR pierde separadores todo el tiempo y devuelve
 * "43,000 00" o "18 500 00" donde el papel dice 43.000,00 y 18.500,00. Después
 * se mira el último grupo: si tiene exactamente dos dígitos son los centavos, y
 * todo lo anterior es la parte entera. Así entran "1.234,56", "1,234.56",
 * "32.000.00" (el punto usado para las dos cosas) y los casos con espacios.
 */
function normalizeAmount(raw: string): number | null {
  const partes = raw
    .replace(/[^\d.,\s]/g, "")
    .split(/[.,\s]+/)
    .filter(Boolean);
  if (partes.length === 0) return null;

  let normalized: string;
  if (partes.length === 1) {
    normalized = partes[0];
  } else {
    const decimales = partes[partes.length - 1];
    const entero = partes.slice(0, -1).join("");
    normalized = decimales.length === 2 ? `${entero}.${decimales}` : `${entero}${decimales}`;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

// Un monto tiene que tener separadores para contar como monto: así una
// cantidad suelta, un número de línea o un código de pedido no se cuelan como
// si fueran plata. Las tres formas que aparecen en tickets reales:
//   1) miles con separador de verdad, con centavos opcionales: "43.000,00",
//      "1,234.56", "32.000.00", "43,000 00" (el OCR perdió la coma decimal).
//   2) miles separados por un espacio, cuando el OCR perdió también ese
//      separador: "18 500 00" por 18.500,00. Acá los centavos son OBLIGATORIOS:
//      sin ellos, "1 000" (la columna de cantidad seguida de un pedazo de
//      número mal leído) se confundía con mil pesos, y un gasto de 27.000
//      entraba como 1.000.
//   3) sin miles, solo centavos: "800,00".
// Los bordes (?<!\d) y (?!\d) evitan agarrar un pedazo de un número más largo:
// sin ellos, en "1 900000" (cantidad 1 + monto pegado) la regla 2 leía "1 900"
// y devolvía 1.900 en vez de dejar que lo resolviera la regla del número
// pegado, que da 9.000.
const MONTO_RE = /(?<!\d)(?:\d{1,3}(?:[.,]\d{3})+(?:[.,\s]\d{2})?|\d{1,3}(?:\s\d{3})+[.,\s]\d{2}|\d+[.,]\d{2})(?!\d)/g;

// Último recurso, solo para renglones de producto: el OCR se comió TODOS los
// separadores y dejó un número pegado ("900000" por 9.000,00). Se acepta si
// termina en "00", que en un ticket son los centavos.
const MONTO_PEGADO_RE = /(?<!\d)\d{3,7}00(?!\d)/g;

function findAllAmounts(text: string): number[] {
  // match() con una regex global arranca siempre de cero, así que no hay que
  // preocuparse por el lastIndex compartido.
  const matches = text.match(MONTO_RE) ?? [];
  return matches.map(normalizeAmount).filter((n): n is number => n !== null && n < 100_000_000);
}

/**
 * Busca el monto total. Primero en las líneas que dicen "total"/"importe": ese
 * es el total de verdad (`confiable: true`). Si el ticket no tiene ninguna
 * (o el OCR no la pudo leer), se devuelve el número más grande como sugerencia,
 * avisando que NO es un total (`confiable: false`).
 */
function findAmount(lines: string[]): { amount: number | null; confiable: boolean } {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (IGNORE_KEYWORDS.some((k) => lower.includes(k))) continue;
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      const candidatos = findAllAmounts(line);
      if (candidatos.length > 0) return { amount: Math.max(...candidatos), confiable: true };
    }
  }

  const relevantLines = lines.filter((l) => !IGNORE_KEYWORDS.some((k) => l.toLowerCase().includes(k)));
  const allAmounts = relevantLines.flatMap(findAllAmounts);
  if (allAmounts.length === 0) return { amount: null, confiable: false };
  return { amount: Math.max(...allAmounts), confiable: false };
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

// Las mismas dos reglas de arriba pero sin la bandera global, para poder usar
// el índice del match y cortar ahí la descripción del producto.
const AMOUNT_RE = new RegExp(MONTO_RE.source);
const AMOUNT_PEGADO_RE = new RegExp(MONTO_PEGADO_RE.source);

const VOCAL_RE = /[aeiouáéíóú]/i;

function soloLetras(token: string): string {
  return token.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, "");
}

/** La cantidad de consonantes seguidas más larga del token. */
function corridaDeConsonantes(letras: string): number {
  let maxima = 0;
  let actual = 0;
  for (const letra of letras) {
    if (VOCAL_RE.test(letra)) {
      actual = 0;
    } else {
      actual++;
      if (actual > maxima) maxima = actual;
    }
  }
  return maxima;
}

/**
 * ¿Este pedazo es ruido y no una palabra del producto?
 *
 * El OCR arrastra el borde impreso del papel hacia adentro del renglón y lo
 * devuelve como tokens tipo "NNN.EW", "NXXN", "|", "SN". Ninguno puede ser el
 * nombre de un producto, y todos se detectan por la misma vía: son pedazos que
 * no se pueden pronunciar.
 */
function esRuido(token: string): boolean {
  const letras = soloLetras(token);
  if (letras.length <= 2) return true; // "—", "1", "3-", "AN", "de"
  if (!VOCAL_RE.test(letras)) return true; // "NXXN", "NyG"
  if (/(.)\1\1/i.test(letras)) return true; // "NNNEW", "EEES": ninguna palabra repite 3 letras
  return corridaDeConsonantes(letras) >= 4; // impronunciable
}

/**
 * ¿Es el código de renglón del ticket ("N° 1", "N*", "No", "N5", "Ns")? El OCR
 * lee ese "Nº" de mil formas distintas. Marca dónde termina el nombre del
 * producto y empieza la columna de cantidad.
 */
function esCodigoDeRenglon(token: string): boolean {
  return /^n[ºo°*?s5.,;:_#-]?\d*[^a-záéíóúñ]*$/i.test(token);
}

/**
 * Deja el nombre del producto solo, sacándole lo que el ticket tiene alrededor:
 * el ruido del borde izquierdo, los puntos de relleno, el código de renglón, la
 * columna de cantidad y la basura del borde derecho.
 *
 *   "- l - CEBOLLA No 1 1"        -> "Cebolla"
 *   "NNN.EW BANANA ECUADOR ...P/C" -> "Banana Ecuador P/c"
 *   "MAND ENCORE N5 7 1"          -> "Mand Encore"
 */
function cleanDescription(raw: string): string | null {
  const tokens = raw
    // puntos y guiones de relleno: "CEBOLLA .....N°1"
    .replace(/[.\-–—]{2,}/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    // Se le sacan los signos pegados a los extremos a cada palabra ("JOSEL]",
    // ".N°1") antes de clasificarla, si no el signo la disfraza. Los tokens que
    // eran solo signos quedan como "" y sirven igual de marca de corte.
    .map((t) => t.replace(/^[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+|[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+$/g, ""));

  // 1) Saltear el ruido del borde izquierdo. Una palabra corta (hasta 4 letras)
  //    seguida de ruido también es ruido: así cae "RUE NS |" pero se conservan
  //    "MAND ENCORE" y "PIM ROJO", que antes se perdían porque tienen una sola
  //    vocal y parecían basura.
  let inicio = 0;
  while (inicio < tokens.length) {
    const actual = tokens[inicio];
    const siguiente = tokens[inicio + 1];
    const esCorta = soloLetras(actual).length <= 4;
    if (esRuido(actual) || (esCorta && siguiente !== undefined && esRuido(siguiente))) {
      inicio++;
    } else {
      break;
    }
  }

  // 2) Cortar en el código de renglón o en el primer token sin letras: de ahí
  //    para adelante está la cantidad y lo que el OCR pescó del borde derecho.
  let fin = inicio;
  while (fin < tokens.length && !esCodigoDeRenglon(tokens[fin]) && soloLetras(tokens[fin]).length > 0) {
    fin++;
  }

  const text = tokens.slice(inicio, fin).filter(Boolean).join(" ");

  if (text.length < 3) return null;
  if (soloLetras(text).length < 3) return null; // descarta líneas de puro ruido/símbolos

  // Título: primera letra de cada palabra en mayúscula, resto tal cual viene
  // (evita gritar "CEBOLLA" pero sin inventar capitalización de siglas).
  return text
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Palabras que describen el envase o la unidad de venta, no el producto. En el
// ticket ocupan un renglón propio debajo de cada producto.
const UNIDADES = new Set([
  "bolsa", "bolsita", "caja", "cajon", "cajón", "jaula", "pack", "paquete", "bandeja",
  "atado", "docena", "unidad", "unidades", "kg", "kilo", "kilos", "gr", "lt", "litro",
  "vacio", "vacío", "sv", "s/v",
]);

/** true si el texto no nombra ningún producto, solo el envase ("BOLSA", "X 1KG"). */
function esSoloUnidad(descripcion: string): boolean {
  const palabras = descripcion
    .toLowerCase()
    .split(/[\s./]+/)
    .map((p) => p.replace(/\d+/g, "")) // "1kg" cuenta como "kg"
    .filter((p) => p && p !== "x");
  return palabras.length > 0 && palabras.every((p) => UNIDADES.has(p));
}

/**
 * Separa cada renglón de "producto" del ticket en un ítem propio (descripción
 * + monto), para poder cargar varios gastos de una en vez de uno solo con el
 * total. Heurística simple línea por línea — se espera que el usuario revise
 * la lista antes de confirmar, no todos los renglones se van a leer bien.
 */
export function leerRenglones(rawText: string): RenglonDeComprobante[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: RenglonDeComprobante[] = [];
  // Nombre de un producto cuyo renglón quedó sin importe. En tickets angostos
  // el OCR corre las columnas y el importe aparece en el renglón siguiente, que
  // es el de la unidad ("BOLSA", "CAJA"). Guardarlo permite volver a juntarlos.
  let productoSinImporte: string | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SUMMARY_LINE_KEYWORDS.some((k) => lower.includes(k))) continue;
    if (DATE_RE.test(line)) continue;

    let amount: number | null = null;
    let corte: number | undefined;

    const match = line.match(AMOUNT_RE);
    if (match && match.index !== undefined) {
      amount = normalizeAmount(match[0]);
      corte = match.index;
    } else {
      // Si el renglón no tiene ningún monto con separadores, se prueba con el
      // número pegado ("900000" por 9.000,00): es la única forma de no perder
      // el ítem cuando el OCR se comió el punto y la coma. Los dos últimos
      // dígitos son los centavos.
      const pegado = line.match(AMOUNT_PEGADO_RE);
      if (pegado && pegado.index !== undefined) {
        amount = Number(pegado[0]) / 100;
        corte = pegado.index;
      }
    }

    if (amount === null || !Number.isFinite(amount) || amount <= 0 || corte === undefined) {
      // Renglón sin importe: si nombra un producto, se lo recuerda por si el
      // importe aparece en el renglón de abajo.
      const soloTexto = cleanDescription(line);
      if (soloTexto && !esSoloUnidad(soloTexto)) productoSinImporte = soloTexto;
      continue;
    }

    const antesDelMonto = line.slice(0, corte);
    let description = cleanDescription(antesDelMonto);
    // La columna "Cant" queda justo antes del importe: "NyG RUCULA.... 4 3,000.00"
    const cantidadLeida = antesDelMonto.match(/(?:^|\s)(\d{1,3})\s*$/);
    const cantidad = cantidadLeida ? Number(cantidadLeida[1]) : 1;

    // El importe cayó en el renglón de la unidad ("BOLSA 27.000,00"): le
    // corresponde al producto de arriba, no a la unidad. Solo se hereda el
    // nombre en ese caso: si la descripción quedó ilegible no se la inventa,
    // porque podría ser otro producto distinto.
    if (description && esSoloUnidad(description) && productoSinImporte) {
      description = productoSinImporte;
    }

    if (description && !esSoloUnidad(description)) {
      items.push({ description, amount, cantidad });
    } else if (description || /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(antesDelMonto)) {
      // Había un producto (algo de texto antes del monto) pero el OCR lo dejó
      // ilegible. Se carga igual con un nombre genérico en vez de tirar el
      // renglón: perder un gasto de la división es peor que tener que
      // renombrarlo a mano. Si antes del monto no hay NADA de texto, ahí sí se
      // descarta, porque es ruido y no un producto.
      items.push({ description: "Sin descripción", amount, cantidad });
    }
    productoSinImporte = null;
  }
  return items;
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
export function leerComprobante(rawText: string): ComprobanteLeido {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const total = findAmount(lines);

  return {
    amount: total.amount,
    totalConfiable: total.confiable,
    expenseDate: findDate(rawText),
    merchant: findMerchant(lines),
    items: aplicarCantidades(leerRenglones(rawText), total),
  };
}

/**
 * Decide si la columna de importes del ticket trae el precio POR UNIDAD o el
 * total del renglón, y en el primer caso multiplica.
 *
 * No se puede saber mirando un renglón suelto, pero sí comparando contra el
 * total impreso: se prueban las dos interpretaciones y gana la que se acerca
 * más. Por ejemplo, en un ticket de verdulería con "NyG RUCULA 4 3.000,00", los
 * renglones suman 214.000 tomando los importes como están y 226.000
 * multiplicando por la cantidad; como el subtotal impreso es 236.000 (226.000
 * más 10.000 de envases), gana la segunda.
 *
 * Sin un total confiable no se multiplica: ante la duda es preferible quedarse
 * corto, que el usuario lo ve y lo corrige, antes que inflar un gasto.
 */
function aplicarCantidades(
  items: RenglonDeComprobante[],
  total: { amount: number | null; confiable: boolean }
): RenglonDeComprobante[] {
  if (!total.confiable || total.amount === null) return items;
  if (!items.some((i) => i.cantidad > 1)) return items;

  const sumaSimple = items.reduce((s, i) => s + i.amount, 0);
  const sumaPorCantidad = items.reduce((s, i) => s + i.amount * i.cantidad, 0);
  if (Math.abs(sumaPorCantidad - total.amount) >= Math.abs(sumaSimple - total.amount)) return items;

  return items.map((i) =>
    i.cantidad > 1
      ? {
          ...i,
          amount: Math.round(i.amount * i.cantidad * 100) / 100,
          description: `${i.description} (x${i.cantidad})`,
        }
      : i
  );
}
