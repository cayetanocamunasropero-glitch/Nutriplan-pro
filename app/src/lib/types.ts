// Tipos que reflejan EXACTAMENTE los datos ya guardados en Supabase por la app clásica.
// No cambiar nombres de campos: la app clásica y la nueva comparten tablas.

export type Macros = { kcal: number; c: number; p: number; f: number };

/** Alimento dentro de un registro. kcal/c/p/f son valores por 100 g (o 100 ml). */
export type LogItem = {
  name: string;
  grams: number;
  kcal: number;
  c: number;
  p: number;
  f: number;
  brand?: string;
  source?: string;
  portion?: number;
  portionLabel?: string;
  [k: string]: unknown;
};

/** Entrada del array `entries` de nutriplan_meal_logs. */
export type LogEntry = {
  id?: string;
  meal?: string;
  mealSlot?: string;
  letter?: string;
  status?: 'completed' | 'partial' | 'skipped' | string;
  freeEntry?: boolean;
  kind?: string; // 'activity' = pasos/actividad (se conserva sin tocar)
  items?: LogItem[];
  comment?: string;
  protein?: string;
  sauce?: string;
  updatedAt?: string;
  [k: string]: unknown;
};

export type MealLog = {
  client_id: string;
  owner_id: string;
  client_uid: string | null;
  log_date: string;
  entries: LogEntry[];
  water_ml: number | null;
  day_notes: string | null;
  updated_at?: string;
};

export type PlanOptionItem = {
  name: string;
  grams: number;
  kcal: number;
  c: number;
  p: number;
  f: number;
  unit?: string;
  choices?: PlanOptionItem[];
  alternatives?: PlanOptionItem[];
  [k: string]: unknown;
};

export type PlanOption = {
  letter: string;
  title?: string;
  notes?: string;
  items: PlanOptionItem[];
  [k: string]: unknown;
};

export type PlanGroup = {
  name: string;
  share?: number;
  options: PlanOption[];
  [k: string]: unknown;
};

/** Contenido de un plan publicado. Puede venir de 3 orígenes:
 *  - PDF / alternativas: { groups, target, planType:'alternative-tracker-v1' }
 *  - editor clásico:     { meals, targets, totals, client_name }
 *  - solo diario:        { groups:[], target, diaryOnly:true } */
export type PlanContent = {
  groups?: PlanGroup[];
  target?: Partial<Macros>;
  targets?: { kcal?: number; carbPercent?: number; proteinPercent?: number; fatPercent?: number };
  meals?: { name: string; share?: number; items: { name: string; grams: number; c: number; p: number; f: number; kcal: number }[]; total?: Macros }[];
  totals?: Macros;
  diaryOnly?: boolean;
  title?: string;
  status?: string;
  planType?: string;
  [k: string]: unknown;
};

export type PublishedPlan = {
  client_id: string;
  owner_id: string;
  client_uid: string | null;
  client_name: string | null;
  content: PlanContent | null;
  published_at: string | null;
  updated_at?: string | null;
};

/** Ficha de cliente guardada en nutriplan_private_store.payload.clients */
export type CoachClient = {
  id: string;
  name: string;
  age?: number | string;
  sex?: 'male' | 'female' | string;
  weight?: number | string;
  height?: number | string;
  activity?: string;
  goal?: string;
  formula?: string;
  carbPct?: number | string;
  proteinPct?: number | string;
  fatPct?: number | string;
  targetKcal?: number | string;
  [k: string]: unknown;
};

export type CoachStore = {
  clients: CoachClient[];
  foods: { id: string; name: string; c: number; p: number; f: number; kcal?: number }[];
  plans: Record<string, unknown>;
  templates: unknown[];
  [k: string]: unknown;
};

export type WeightEntry = { id: string; recorded_on: string; weight_kg: number; shared_with_coach: boolean };
export type ProgressPhoto = { id: string; recorded_on: string; note: string | null; storage_path: string; shared_with_coach: boolean };

export type Food = {
  id?: string;
  name: string;
  brand?: string;
  kcal: number;
  c: number;
  p: number;
  f: number;
  portion?: number;
  portionLabel?: string;
  source?: string;
  /** Nutri-Score del producto (a–e), solo si lo da Open Food Facts */
  nutriscore?: string;
};
