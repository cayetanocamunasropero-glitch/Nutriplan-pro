import { OWNER, PHOTO_BUCKET, supabase } from './supabase';
import type { CoachClient, CoachStore, LogEntry, MealLog, PlanContent, ProgressPhoto, PublishedPlan, WeightEntry } from './types';

const now = () => new Date().toISOString();

function check<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

// ============================ CLIENTE ============================

export async function getMyPlan(uid: string): Promise<PublishedPlan | null> {
  const rows = check(
    await supabase
      .from('nutriplan_published_plans')
      .select('client_id,owner_id,client_uid,client_name,content,published_at,updated_at')
      .eq('client_uid', uid),
  ) as PublishedPlan[];
  return rows.find((x) => Array.isArray(x.content?.groups) && x.content!.groups!.length) || rows[0] || null;
}

export async function claimInvite(code: string) {
  const { error } = await supabase.rpc('nutriplan_claim_invitation', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
}

export type Onboarding = { form: Record<string, string>; complete: boolean; seen: string[]; health: Record<string, string>; healthShare: boolean };

export async function getOnboarding(uid: string): Promise<Onboarding> {
  const [a, b] = await Promise.all([
    supabase.from('nutriplan_client_onboarding').select('form,completed_at,tutorial_seen').eq('client_uid', uid),
    supabase.from('nutriplan_client_health_private').select('info,share_with_coach').eq('client_uid', uid),
  ]);
  const row = (check(a) as { form: Record<string, string>; completed_at: string | null; tutorial_seen: string[] | null }[])[0];
  const h = (check(b) as { info: Record<string, string>; share_with_coach: boolean }[])[0];
  return {
    form: row?.form || {},
    complete: !!row?.completed_at,
    seen: Array.isArray(row?.tutorial_seen) ? row!.tutorial_seen! : [],
    health: h?.info || {},
    healthShare: !!h?.share_with_coach,
  };
}

export async function saveOnboarding(uid: string, form: Record<string, string>, health: Record<string, string>, share: boolean) {
  const t = now();
  const hasHealth = Object.values(health).some((v) => String(v || '').trim());
  check(await supabase.from('nutriplan_client_onboarding').upsert({ client_uid: uid, owner_id: OWNER, form, updated_at: t }, { onConflict: 'client_uid' }));
  check(
    await supabase
      .from('nutriplan_client_health_private')
      .upsert({ client_uid: uid, owner_id: OWNER, info: hasHealth ? health : {}, share_with_coach: hasHealth && share, updated_at: t }, { onConflict: 'client_uid' }),
  );
  check(await supabase.from('nutriplan_client_onboarding').update({ completed_at: t, updated_at: t }).eq('client_uid', uid));
}

const LOG_COLS = 'client_id,owner_id,client_uid,log_date,entries,water_ml,day_notes,updated_at';

export async function getLog(clientId: string, date: string): Promise<MealLog | null> {
  const rows = check(await supabase.from('nutriplan_meal_logs').select(LOG_COLS).eq('client_id', clientId).eq('log_date', date)) as MealLog[];
  return rows[0] || null;
}

export async function getLogs(clientId: string, from: string, to: string): Promise<MealLog[]> {
  return check(
    await supabase.from('nutriplan_meal_logs').select(LOG_COLS).eq('client_id', clientId).gte('log_date', from).lte('log_date', to).order('log_date', { ascending: false }),
  ) as MealLog[];
}

export async function saveLog(plan: PublishedPlan, uid: string, date: string, entries: LogEntry[], water: number, notes: string) {
  check(
    await supabase.from('nutriplan_meal_logs').upsert(
      {
        client_id: plan.client_id,
        owner_id: plan.owner_id,
        client_uid: uid,
        log_date: date,
        entries,
        water_ml: Math.max(0, Math.min(10000, Math.round(water || 0))),
        day_notes: String(notes || '').slice(0, 3000),
        updated_at: now(),
      },
      { onConflict: 'client_id,log_date' },
    ),
  );
}

export async function getWeights(clientId: string, limit = 120): Promise<WeightEntry[]> {
  return check(
    await supabase.from('nutriplan_weight_entries').select('id,recorded_on,weight_kg,shared_with_coach').eq('client_id', clientId).order('recorded_on', { ascending: false }).limit(limit),
  ) as WeightEntry[];
}

export async function saveWeight(plan: PublishedPlan, uid: string, day: string, kg: number, share: boolean) {
  check(
    await supabase
      .from('nutriplan_weight_entries')
      .upsert(
        { client_id: plan.client_id, owner_id: plan.owner_id, client_uid: uid, recorded_on: day, weight_kg: kg, shared_with_coach: share },
        { onConflict: 'client_id,recorded_on' },
      ),
  );
}

export async function deleteWeight(id: string) {
  check(await supabase.from('nutriplan_weight_entries').delete().eq('id', id));
}

export async function getPhotos(clientId: string, limit = 40): Promise<ProgressPhoto[]> {
  return check(
    await supabase
      .from('nutriplan_progress_photos')
      .select('id,recorded_on,note,storage_path,shared_with_coach')
      .eq('client_id', clientId)
      .order('recorded_on', { ascending: false })
      .limit(limit),
  ) as ProgressPhoto[];
}

export async function photoUrl(path: string) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadPhoto(plan: PublishedPlan, uid: string, day: string, file: File, note: string, share: boolean) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5242880) throw new Error('Usa una imagen JPG, PNG o WebP de menos de 5 MB.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = uid + '/' + day + '/' + crypto.randomUUID() + '.' + ext;
  check(await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type }));
  const r = await supabase.from('nutriplan_progress_photos').insert({
    client_id: plan.client_id,
    owner_id: plan.owner_id,
    client_uid: uid,
    recorded_on: day,
    note: note.trim().slice(0, 500),
    storage_path: path,
    shared_with_coach: share,
  });
  if (r.error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw r.error;
  }
}

export async function deletePhoto(p: ProgressPhoto) {
  await supabase.storage.from(PHOTO_BUCKET).remove([p.storage_path]);
  check(await supabase.from('nutriplan_progress_photos').delete().eq('id', p.id));
}

// ============================ COACH ============================

export async function loadStore(): Promise<CoachStore> {
  const rows = check(await supabase.from('nutriplan_private_store').select('payload').eq('owner_id', OWNER)) as { payload: CoachStore }[];
  const p = (rows[0]?.payload || {}) as CoachStore;
  return {
    ...p,
    clients: Array.isArray(p.clients) ? p.clients : [],
    foods: Array.isArray(p.foods) ? p.foods : [],
    plans: p.plans && typeof p.plans === 'object' ? p.plans : {},
    templates: Array.isArray(p.templates) ? p.templates : [],
  };
}

/** Lee la versión más reciente, aplica el cambio y guarda: así no se pisan cambios hechos desde la app clásica. */
export async function updateStore(mutate: (s: CoachStore) => void): Promise<CoachStore> {
  const s = await loadStore();
  mutate(s);
  check(await supabase.from('nutriplan_private_store').upsert({ owner_id: OWNER, payload: s, updated_at: now() }, { onConflict: 'owner_id' }));
  return s;
}

export async function listPublished(): Promise<PublishedPlan[]> {
  return check(
    await supabase.from('nutriplan_published_plans').select('client_id,owner_id,client_uid,client_name,content,published_at,updated_at').eq('owner_id', OWNER),
  ) as PublishedPlan[];
}

export async function recentLogsAll(from: string): Promise<Pick<MealLog, 'client_id' | 'log_date' | 'entries' | 'water_ml' | 'day_notes' | 'updated_at'>[]> {
  return check(
    await supabase
      .from('nutriplan_meal_logs')
      .select('client_id,log_date,entries,water_ml,day_notes,updated_at')
      .eq('owner_id', OWNER)
      .gte('log_date', from)
      .order('log_date', { ascending: false })
      .limit(1000),
  ) as MealLog[];
}

export async function coachOnboarding(clientUid: string) {
  const [a, b] = await Promise.all([
    supabase.from('nutriplan_client_onboarding').select('form,completed_at').eq('client_uid', clientUid),
    supabase.from('nutriplan_client_health_private').select('info,share_with_coach').eq('client_uid', clientUid),
  ]);
  const row = (a.data || [])[0] as { form: Record<string, string>; completed_at: string | null } | undefined;
  const h = (b.data || [])[0] as { info: Record<string, string>; share_with_coach: boolean } | undefined;
  return { form: row?.form || null, completedAt: row?.completed_at || null, health: h?.share_with_coach ? h.info : null };
}

export async function getDraft(clientId: string): Promise<PlanContent | null> {
  const rows = check(await supabase.from('nutriplan_diet_drafts').select('content').eq('client_id', clientId)) as { content: PlanContent }[];
  return rows[0]?.content || null;
}

/** Guarda el borrador y lo publica (misma lógica que la app clásica: PATCH si existe para conservar client_uid). */
export async function publishPlan(c: CoachClient, draft: PlanContent) {
  const t = now();
  check(await supabase.from('nutriplan_diet_drafts').upsert({ client_id: c.id, owner_id: OWNER, content: draft, updated_at: t }, { onConflict: 'client_id' }));
  const content = { ...JSON.parse(JSON.stringify(draft)), status: 'published', planType: 'alternative-tracker-v1' };
  const existing = check(await supabase.from('nutriplan_published_plans').select('client_id').eq('client_id', c.id)) as unknown[];
  if (existing.length)
    check(await supabase.from('nutriplan_published_plans').update({ content, client_name: c.name, published_at: t, updated_at: t }).eq('client_id', c.id));
  else
    check(
      await supabase.from('nutriplan_published_plans').insert({ client_id: c.id, owner_id: OWNER, client_name: c.name, content, published_at: t, updated_at: t }),
    );
}

export async function setPlanTarget(clientId: string, content: PlanContent, target: { kcal: number; c: number; p: number; f: number }) {
  const next = { ...content, target };
  check(await supabase.from('nutriplan_published_plans').update({ content: next, updated_at: now() }).eq('client_id', clientId));
}

async function sha256(t: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return Array.from(new Uint8Array(d))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return 'NP-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('').match(/.{4}/g)!.join('-');
}

/** Crea el código de invitación de un solo uso (7 días). */
export async function createInvite(c: CoachClient, target: PlanContent['target'] | null): Promise<string> {
  const pub = check(await supabase.from('nutriplan_published_plans').select('client_id,client_uid').eq('client_id', c.id)) as { client_uid: string | null }[];
  if (!pub.length) {
    const t = now();
    check(
      await supabase.from('nutriplan_published_plans').insert({
        client_id: c.id,
        owner_id: OWNER,
        client_uid: null,
        client_name: c.name,
        content: { groups: [], target: target || {}, diaryOnly: true },
        published_at: t,
        updated_at: t,
      }),
    );
  } else if (pub[0].client_uid) throw new Error('Este cliente ya tiene una cuenta vinculada. No necesita otro código.');
  const code = makeCode();
  check(
    await supabase.from('nutriplan_invitations').upsert(
      {
        client_id: c.id,
        owner_id: OWNER,
        email: null,
        token_hash: await sha256(code),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        redeemed_at: null,
      },
      { onConflict: 'client_id' },
    ),
  );
  return code;
}
