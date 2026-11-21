import type { PlanGroup, Macros } from '../types';
export function npTableParse(pages: { str: string; x: number; y: number }[][]): PlanGroup[] & {
  pdfTarget?: Partial<Macros> | null;
  readReport?: { groups: number; options: number; ingredients: number };
};
