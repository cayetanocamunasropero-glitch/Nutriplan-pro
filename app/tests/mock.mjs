// Supabase simulado para Playwright: auth + PostgREST mínimo + storage + /api/foods.
// No toca ningún dato real.
export const OWNER = '9b3479bd-128a-464b-844f-bb49892affec';
export const CLIENT_UID = '11111111-2222-3333-4444-555555555555';

const iso = (d) => d.toISOString().slice(0, 10);
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export function seed({ linked = true } = {}) {
  const clientId = 'c-mario';
  const groups = [
    {
      name: 'Desayuno',
      share: 20,
      options: [
        { letter: 'A', title: 'Tostadas con pavo', items: [{ name: 'Pan integral', grams: 80, kcal: 250, c: 41, p: 10, f: 4 }, { name: 'Pechuga de pavo', grams: 60, kcal: 105, c: 1, p: 22, f: 1.5 }, { name: 'Aceite de oliva virgen extra', grams: 10, kcal: 899, c: 0, p: 0, f: 99.9 }] },
        { letter: 'B', title: 'Avena con yogur', items: [{ name: 'Copos de avena', grams: 60, kcal: 372, c: 60, p: 13, f: 7 }, { name: 'Yogur natural', grams: 125, kcal: 61, c: 4.7, p: 3.5, f: 3.3 }] },
      ],
    },
    {
      name: 'Comida',
      share: 40,
      options: [
        { letter: 'A', title: 'Arroz con pollo', items: [{ name: 'Arroz blanco crudo', grams: 90, kcal: 360, c: 79, p: 7, f: 0.6 }, { name: 'Pechuga de pollo', grams: 160, kcal: 110, c: 0, p: 23, f: 1.5, choices: [{ name: 'Pechuga de pollo', grams: 160, kcal: 110, c: 0, p: 23, f: 1.5 }, { name: 'Lomo de cerdo', grams: 150, kcal: 150, c: 0, p: 21, f: 7 }] }] },
      ],
    },
    { name: 'Cena', share: 25, options: [{ letter: 'A', title: 'Tortilla y ensalada', items: [{ name: 'Huevo', grams: 120, kcal: 143, c: 0.7, p: 12.6, f: 9.5 }, { name: 'Ensalada verde', grams: 150, kcal: 20, c: 3, p: 1.3, f: 0.2 }] }] },
  ];
  const logs = [];
  for (let i = 1; i <= 12; i++) {
    if (i === 4 || i === 9) continue;
    const k = 0.75 + ((i * 37) % 50) / 100;
    logs.push({
      client_id: clientId,
      owner_id: OWNER,
      client_uid: CLIENT_UID,
      log_date: day(-i),
      entries: [
        { id: 'e' + i, freeEntry: true, meal: 'Libre:e' + i, mealSlot: 'Comida', letter: 'Libre', status: 'completed', items: [{ name: 'Arroz blanco cocido', grams: Math.round(500 * k), kcal: 130, c: 28, p: 2.7, f: 0.3 }] },
        { id: 'f' + i, freeEntry: true, meal: 'Libre:f' + i, mealSlot: 'Cena', letter: 'Libre', status: 'completed', items: [{ name: 'Salmón', grams: Math.round(250 * k), kcal: 208, c: 0, p: 20, f: 13 }] },
        { kind: 'activity', steps: 8000 + i * 100 },
      ],
      water_ml: 1500 + i * 50,
      day_notes: i === 1 ? 'Ayer entrené pierna, con bastante hambre por la noche.' : i === 3 ? 'Comida fuera con amigos.' : '',
      updated_at: new Date().toISOString(),
    });
  }
  return {
    nutriplan_private_store: [
      {
        owner_id: OWNER,
        payload: {
          clients: [
            { id: clientId, name: 'Mario Prueba', age: 34, sex: 'male', weight: 82, height: 178, activity: '1.55', goal: '-15', formula: 'revised', carbPct: 45, proteinPct: 30, fatPct: 25, targetKcal: '' },
            { id: 'c-laura', name: 'Laura Martín', age: 29, sex: 'female', weight: 61, height: 165, activity: '1.375', goal: '0', formula: 'revised', carbPct: 50, proteinPct: 25, fatPct: 25, targetKcal: '' },
            { id: 'c-pablo', name: 'Pablo Ruiz', age: 41, sex: 'male', weight: 95, height: 183, activity: '1.2', goal: '-20', formula: 'revised', carbPct: 40, proteinPct: 30, fatPct: 30, targetKcal: '' },
          ],
          foods: [],
          plans: {},
          templates: [],
          legacyFieldKeep: 'no-borrar',
        },
      },
    ],
    nutriplan_published_plans: [
      { client_id: clientId, owner_id: OWNER, client_uid: linked ? CLIENT_UID : null, client_name: 'Mario Prueba', content: { title: 'Plan noviembre', groups, target: { kcal: 2300, c: 260, p: 170, f: 64 }, planType: 'alternative-tracker-v1' }, published_at: new Date().toISOString() },
      { client_id: 'c-laura', owner_id: OWNER, client_uid: 'laura-uid', client_name: 'Laura Martín', content: { groups: [], target: { kcal: 1900, c: 237, p: 119, f: 53 }, diaryOnly: true }, published_at: new Date().toISOString() },
    ],
    nutriplan_meal_logs: logs,
    nutriplan_weight_entries: [0, 7, 14, 21, 28, 35].map((d, i) => ({ id: 'w' + i, client_id: clientId, owner_id: OWNER, client_uid: CLIENT_UID, recorded_on: day(-d), weight_kg: 82 + i * 0.45, shared_with_coach: true })),
    nutriplan_progress_photos: [],
    nutriplan_client_onboarding: linked ? [{ client_uid: CLIENT_UID, owner_id: OWNER, form: { firstName: 'Mario', lastName: 'Prueba', weightKg: '82', dailyActivity: 'Moderada (me muevo regularmente)', usualBreakfast: 'Café con tostadas' }, completed_at: new Date().toISOString(), tutorial_seen: [] }] : [],
    nutriplan_client_health_private: [],
    nutriplan_diet_drafts: [],
    nutriplan_invitations: [],
  };
}

function matches(row, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const [op, ...rest] = v.split('.');
    const val = rest.join('.');
    const cell = row[k] == null ? null : String(row[k]);
    if (op === 'eq' && cell !== val) return false;
    if (op === 'gte' && !(cell >= val)) return false;
    if (op === 'lte' && !(cell <= val)) return false;
  }
  return true;
}

export async function install(page, db, { uid }) {
  const email = uid === OWNER ? 'coach@example.com' : 'cliente@example.com';
  const user = { id: uid, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const session = () => ({ access_token: 'tok-' + uid, refresh_token: 'ref-' + uid, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user });
  const writes = [];

  await page.route('**/dmztwsrfsydouuiviutc.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (path.startsWith('/auth/v1/token')) return json(session());
    if (path.startsWith('/auth/v1/user')) return json(user);
    if (path.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });
    if (path.startsWith('/auth/v1/signup')) return json(session());
    if (path.startsWith('/storage/v1/object/sign')) return json({ signedURL: '/object/sign/x?token=1' });
    if (path.startsWith('/storage/v1/')) return json({ Key: 'x' });
    if (path === '/rest/v1/rpc/nutriplan_claim_invitation') {
      const body = req.postDataJSON();
      if (!/^NP-/.test(body.p_code)) return json({ message: 'Código no válido o caducado' }, 400);
      db.nutriplan_published_plans[0].client_uid = uid;
      return json(null);
    }
    const table = path.replace('/rest/v1/', '');
    const rows = db[table];
    if (!rows) return json({ message: 'tabla desconocida ' + table }, 404);
    const params = [...url.searchParams.entries()];
    const method = req.method();
    if (method === 'GET' || method === 'HEAD') {
      let out = rows.filter((r) => matches(r, params));
      const order = url.searchParams.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        out = [...out].sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (dir === 'desc' ? -1 : 1));
      }
      const limit = +url.searchParams.get('limit') || 0;
      if (limit) out = out.slice(0, limit);
      return json(out);
    }
    const body = req.postData() ? req.postDataJSON() : null;
    writes.push({ method, table, params, body });
    if (method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const conflict = url.searchParams.get('on_conflict');
      for (const b of list) {
        const keys = conflict ? conflict.split(',') : null;
        const i = keys ? rows.findIndex((r) => keys.every((k) => String(r[k]) === String(b[k]))) : -1;
        if (i >= 0) rows[i] = { ...rows[i], ...b };
        else rows.push({ id: crypto.randomUUID(), ...b });
      }
      return route.fulfill({ status: 201, body: '' });
    }
    if (method === 'PATCH') {
      rows.forEach((r, i) => {
        if (matches(r, params)) rows[i] = { ...r, ...body };
      });
      return route.fulfill({ status: 204, body: '' });
    }
    if (method === 'DELETE') {
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], params)) rows.splice(i, 1);
      return route.fulfill({ status: 204, body: '' });
    }
    return json({}, 400);
  });

  await page.route('**/api/foods**', (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get('barcode'))
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ product: { code: u.searchParams.get('barcode'), product_name: 'Yogur griego ligero', brands: 'Hacendado', nutriments: { 'energy-kcal_100g': 70, carbohydrates_100g: 4, proteins_100g: 8, fat_100g: 2.5 }, serving_size: '125 g' } }) });
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ products: [{ code: '842', product_name: 'Pechuga de pollo en lonchas', brands: 'Hacendado', nutriments: { 'energy-kcal_100g': 98, carbohydrates_100g: 1.5, proteins_100g: 21, fat_100g: 1.2 } }] }),
    });
  });
  return writes;
}

export { iso, day };
