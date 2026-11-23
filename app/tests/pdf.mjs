// Comprueba los lectores de PDF (tabla y «menú con opciones»): npm run test:pdf
import { readFileSync, readdirSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { npTableParse } from '../src/lib/pdf/pdftable.js';
import { looksLikeMenu, parseMenuPdf } from '../src/lib/pdf/menu.ts';
const dir = process.argv[2];
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.pdf'))) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(dir + '/' + f)), verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] })));
  const table = npTableParse(pages);
  const menu = looksLikeMenu(pages) ? parseMenuPdf(pages) : null;
  const useMenu = menu && menu.report.options > table.reduce((n, g) => n + g.options.length, 0);
  const r = useMenu ? Object.assign(menu.groups, { readReport: menu.report, pdfTarget: menu.target }) : table;
  let opts = 0, off = 0, missing = 0;
  for (const g of r) for (const o of g.options) {
    opts++;
    const k = o.items.reduce((a, i) => a + (i.kcal * i.grams) / 100, 0);
    if (!useMenu && o.items.some((i) => !Number.isFinite(+i.kcal))) missing++;
    if (typeof o.pdfKcal === 'number' && Math.abs(o.pdfKcal - k) > 6) off++;
  }
  const okk = r.length && opts && !missing;
  if (!okk) bad++;
  console.log((okk ? '✓' : '✗'), useMenu ? '[menú]' : '[tabla]', f.slice(0, 56), JSON.stringify(r.readReport), 'target', JSON.stringify(r.pdfTarget), off ? `· ${off} opciones con kcal ≠ PDF` : '', useMenu && menu.notes?.length ? '\n    · ' + menu.notes.join(' · ') + ` · ${menu.coachNotes.length} notas` : '');
}
process.exit(bad ? 1 : 0);
