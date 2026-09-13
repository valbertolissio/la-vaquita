import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { parseReceiptText } from "./src/Utilidades/receiptParser";
async function main() {
  const buf = await sharp(process.argv[2]).rotate().grayscale().resize({ width: 2400, withoutEnlargement: false }).normalize().toBuffer();
  const worker = await createWorker("spa");
  const { data } = await worker.recognize(buf);
  await worker.terminate();
  const p = parseReceiptText(data.text);
  console.log("total:", p.amount, "| confiable:", p.totalConfiable, "| items:", p.items.length);
  p.items.forEach((i, n) => console.log(`${n + 1}. ${i.description} -> ${i.amount}`));
}
main();
