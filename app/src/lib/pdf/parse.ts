import type { PlanGroup, Macros } from '../types';
import { looksLikeMenu, parseMenuPdf } from './menu';

/** Lee un PDF de dieta (tabla ALIMENTO · CANT. · KCAL · HC · P · G) y devuelve grupos con opciones. */
export async function parseDietPdf(file: File) {
  const [pdfjs, worker, { npTableParse }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    import('./pdftable.js'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (pdf.numPages > 40) throw new Error('El PDF tiene más de 40 páginas.');
  const pages: { str: string; x: number; y: number }[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    pages.push(
      (tc.items as { str?: string; transform?: number[] }[])
        .filter((it) => typeof it.str === 'string' && it.transform)
        .map((it) => ({ str: it.str!, x: it.transform![4], y: it.transform![5] })),
    );
  }
  // Formato «Opción X | título | kcal» (menú con opciones) o tabla ALIMENTO · CANT. · KCAL · HC · P · G
  const table = npTableParse(pages);
  const tableOptions = table.reduce((n, g) => n + g.options.length, 0);
  if (looksLikeMenu(pages)) {
    const menu = parseMenuPdf(pages);
    if (menu.report.options > tableOptions) return { groups: menu.groups as PlanGroup[], target: menu.target, report: menu.report, kind: 'menu' as const };
  }
  if (!table.length) throw new Error('No se detectaron comidas en el PDF. Puede ser una imagen escaneada o tener otro formato.');
  return { groups: table as PlanGroup[], target: (table.pdfTarget || null) as Partial<Macros> | null, report: table.readReport, kind: 'tabla' as const };
}
