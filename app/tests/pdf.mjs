// Comprueba el lector de PDF por tabla: node tests/pdf.mjs carpeta_con_pdfs
import { readFileSync, readdirSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { npTableParse } from '../src/lib/pdf/pdftable.js';
const dir = process.argv[2];
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.pdf'))) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(dir + '/' + f)), verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] })));
  const r = npTableParse(pages);
  let opts = 0, off = 0, missing = 0;
  for (const g of r) for (const o of g.options) {
    opts++;
    const k = o.items.reduce((a, i) => a + (i.kcal * i.grams) / 100, 0);
    if (o.items.some((i) => !Number.isFinite(+i.kcal))) missing++;
    if (typeof o.pdfKcal === 'number' && Math.abs(o.pdfKcal - k) > 6) off++;
  }
  const okk = r.length && opts && !missing;
  if (!okk) bad++;
  console.log((okk ? '✓' : '✗'), f.slice(0, 60), JSON.stringify(r.readReport), 'target', JSON.stringify(r.pdfTarget), off ? `· ${off} opciones con kcal ≠ PDF` : '');
}
process.exit(bad ? 1 : 0);
