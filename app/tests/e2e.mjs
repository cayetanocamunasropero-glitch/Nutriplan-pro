// Prueba de extremo a extremo con Supabase simulado.
// Uso: npm run build && node tests/e2e.mjs [carpeta_capturas]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright del sistema
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { CLIENT_UID, OWNER, install, seed } from './mock.mjs';

const OUT = process.argv[2] || 'tests/shots';
mkdirSync(OUT, { recursive: true });
const PORT = 4179;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => /Local/.test(String(d)) && r()));
process.on('exit', () => server.kill());
process.on('unhandledRejection', (e) => { console.error(e); server.kill(); process.exit(1); });
process.on('uncaughtException', (e) => { console.error(e); server.kill(); process.exit(1); });
const BASE = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
let failures = 0;
const ok = (cond, label) => {
  console.log((cond ? '✓ ' : '✗ ') + label);
  if (!cond) failures++;
};

async function ctx(theme = 'light') {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme, locale: 'es-ES', hasTouch: true });
  const p = await c.newPage();
  p.on('pageerror', (e) => {
    console.log('PAGE ERROR', e.message);
    failures++;
  });
  return { c, p };
}

async function login(p, email) {
  await p.goto(BASE);
  await p.getByPlaceholder('tu@correo.com').fill(email);
  await p.getByPlaceholder('••••••••').fill('secreto123');
  await p.getByRole('button', { name: 'Entrar' }).click();
}

// ---------- 1. Cliente con plan: registrar comida, agua, plan, peso ----------
{
  const db = seed();
  const { c, p } = await ctx();
  const writes = await install(p, db, { uid: CLIENT_UID });
  await p.goto(BASE);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/01-login.png` });
  await login(p, 'cliente@example.com');
  await p.getByText('Te quedan').first().waitFor();
  ok(await p.getByRole('heading', { name: 'Mario' }).isVisible(), 'saludo con el nombre del cuestionario');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/02-hoy-vacio.png` });

  // Añadir desde la biblioteca
  await p.getByRole('button', { name: 'Añadir a Comida' }).click();
  await p.getByPlaceholder('Busca: pollo, avena, yogur…').fill('arroz blanco cocido');
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/03-buscar.png` });
  await p.getByRole('button', { name: /Arroz blanco cocido/ }).first().click();
  await p.getByLabel('Cantidad en g').fill('200');
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/04-cantidad.png` });
  await p.getByRole('button', { name: 'Añadir', exact: true }).click();
  // Añadir desde el catálogo externo
  await p.getByPlaceholder('Busca: pollo, avena, yogur…').fill('pechuga lonchas');
  await p.getByRole('button', { name: /Pechuga de pollo en lonchas/ }).click();
  await p.getByLabel('Cantidad en g').fill('100');
  await p.getByRole('button', { name: 'Añadir', exact: true }).click();
  await p.getByRole('button', { name: /Listo · 2 alimentos/ }).click();
  await p.waitForTimeout(900);
  const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const L = () => db.nutriplan_meal_logs.find((l) => l.log_date === todayIso);
  let log = L();
  ok(log && log.entries.length === 2, 'dos alimentos guardados en nutriplan_meal_logs');
  ok(log && log.entries.every((e) => e.freeEntry && e.mealSlot === 'Comida' && e.items[0].grams > 0), 'formato de entrada compatible (freeEntry/mealSlot/items)');
  // 260 kcal arroz + 98 pollo = 358
  ok(await p.getByText('358 / 2300').isVisible(), 'resumen muestra 358 / 2300 kcal');

  // Agua
  await p.getByRole('button', { name: 'Añadir 250 ml' }).click();
  await p.getByRole('button', { name: 'Añadir 250 ml' }).click();
  await p.waitForTimeout(700);
  log = L();
  ok(log && log.water_ml === 500, 'agua 500 ml guardada');
  await p.screenshot({ path: `${OUT}/05-hoy-con-comida.png`, fullPage: true });

  // Editar y borrar con deshacer
  await p.getByRole('button', { name: /Pechuga de pollo en lonchas/ }).click();
  await p.getByRole('button', { name: 'Quitar de este día' }).click();
  await p.waitForTimeout(600);
  log = L();
  ok(log.entries.length === 1, 'borrar alimento');
  await p.getByRole('button', { name: 'Deshacer' }).last().click();
  await p.waitForTimeout(700);
  log = L();
  ok(log.entries.length === 2, 'deshacer borrado');

  // Repetir ayer
  await p.getByRole('button', { name: 'Repetir ayer' }).first().click();
  await p.waitForTimeout(700);
  log = L();
  ok(log.entries.length === 3, 'repetir cena de ayer');

  // Actividad (formato compatible con la versión clásica)
  await p.getByRole('button', { name: 'Cerrar la ayuda' }).click();
  await p.getByRole('button', { name: 'Anotar' }).click();
  await p.getByPlaceholder('Ej. 8500').fill('9200');
  await p.getByRole('button', { name: 'Pádel · Partido' }).click();
  await p.getByRole('button', { name: 'Añadir entrenamiento' }).click();
  await p.getByRole('button', { name: 'Guardar actividad' }).click();
  await p.waitForTimeout(700);
  log = L();
  const act = log.entries.find((e) => e.kind === 'activity');
  ok(act && act.steps === 9200 && act.activities[0].type === 'Pádel · Partido' && act.meal === '__actividad_y_pasos', 'pasos y actividad guardados en formato clásico');
  ok(log.entries.filter((e) => e.kind === 'activity').length === 1, 'una sola entrada de actividad por día');

  // Registrar una opción del plan desde «Hoy» con un toque, y deshacer
  await p.getByRole('button', { name: /Registrar opción A de Desayuno/ }).click();
  await p.waitForTimeout(700);
  log = L();
  const quick = log.entries.find((e) => e.meal === 'Desayuno' && !e.freeEntry);
  ok(quick && quick.letter === 'A' && quick.items.length === 3 && quick.items.every((i) => i.source === 'Tu plan'), 'opción del plan registrada desde «Hoy» con un toque');
  await p.getByRole('button', { name: 'Deshacer' }).last().click();
  await p.waitForTimeout(700);
  log = L();
  ok(!log.entries.some((e) => e.meal === 'Desayuno' && !e.freeEntry), 'deshacer el registro rápido del plan');

  // Plan
  await p.getByRole('button', { name: 'Mi plan', exact: true }).click();
  await p.getByRole('heading', { name: 'Mi plan' }).waitFor();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/06-plan.png`, fullPage: true });
  await p.getByRole('tab', { name: 'B', exact: true }).first().click();
  await p.getByRole('button', { name: 'Registrar' }).first().click();
  await p.waitForTimeout(800);
  log = L();
  const planEntry = log.entries.find((e) => e.meal === 'Desayuno' && !e.freeEntry);
  ok(planEntry && planEntry.letter === 'B' && planEntry.items.length === 2, 'opción B del desayuno registrada con formato del plan');
  // Intercambio de alimento (arroz → pasta) y total del día
  ok(await p.getByText('Tu día con estas opciones').isVisible(), 'total del día con las opciones elegidas');
  ok(await p.getByRole('heading', { name: 'Notas de tu coach' }).isVisible(), 'notas del coach en «Mi plan»');
  const before = await p.locator('#day-total').locator('..').textContent();
  await p.getByRole('button', { name: /Cambiar Arroz blanco crudo/ }).click();
  await p.getByRole('radio', { name: /Pasta seca cruda/ }).click();
  await p.waitForTimeout(500);
  ok(await p.getByText('en lugar de arroz blanco crudo').isVisible(), 'intercambio de alimento aplicado');
  ok((await p.locator('#day-total').locator('..').textContent()) !== before, 'el total del día se recalcula al cambiar un alimento');
  // Opción que se arma eligiendo (wraps)
  await p.getByRole('tab', { name: 'B', exact: true }).nth(1).click();
  await p.getByRole('radio', { name: 'Atún' }).click();
  await p.getByRole('radio', { name: 'Yogur 50 g' }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/06b-plan-combinacion.png`, fullPage: true });
  await p.getByRole('button', { name: 'Registrar' }).first().click();
  await p.waitForTimeout(800);
  log = L();
  const kitEntry = log.entries.find((e) => e.meal === 'Comida' && !e.freeEntry);
  ok(kitEntry && kitEntry.letter === 'B' && kitEntry.combo === 'Atún · Yogur 50 g' && kitEntry.items.map((i) => i.name).join('|') === 'Tortilla de trigo|Atún al natural|Salsa de yogur', 'combinación elegida registrada con sus alimentos');
  await p.getByRole('button', { name: 'Hoy', exact: true }).click();
  await p.waitForTimeout(500);
  ok(await p.getByText('(Atún · Yogur 50 g)').first().isVisible(), 'la combinación elegida se ve en «Hoy»');
  await p.getByRole('button', { name: 'Mi plan', exact: true }).click();
  await p.waitForTimeout(300);

  // Progreso
  await p.getByRole('button', { name: 'Progreso', exact: true }).click();
  await p.getByRole('heading', { name: 'Progreso' }).waitFor();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/07-progreso.png`, fullPage: true });
  await p.getByRole('button', { name: 'Peso' }).first().click();
  await p.getByPlaceholder('00,0').fill('84,6');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await p.waitForTimeout(600);
  ok(db.nutriplan_weight_entries.some((w) => +w.weight_kg === 84.6), 'peso guardado');

  // Botón atrás de Android
  const handled = await p.evaluate(() => window.npBack && window.npBack());
  ok(handled === true, 'window.npBack vuelve a «Hoy»');
  await p.getByRole('button', { name: 'Yo', exact: true }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/08-yo.png` });
  ok(await p.getByText('2300 kcal').isVisible(), 'tarjeta de objetivo visible en «Yo»');
  await p.getByRole('button', { name: 'Privacidad y mis datos' }).click();
  await p.getByRole('heading', { name: 'Quién los ve' }).waitFor();
  await p.screenshot({ path: `${OUT}/08b-privacidad.png` });
  const dl = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Descargar mis datos' }).click();
  const file = await dl;
  ok(/nutriplan-mis-datos-.*\.json/.test(file.suggestedFilename()), 'descarga de datos personales');
  await p.keyboard.press('Escape');
  ok(!writes.some((w) => w.table === 'nutriplan_private_store'), 'el cliente nunca escribe en la ficha privada del coach');
  await c.close();
}

// ---------- 2. Cliente nuevo: código de WhatsApp + cuestionario (modo oscuro) ----------
{
  const db = seed({ linked: false });
  const { c, p } = await ctx('dark');
  await install(p, db, { uid: CLIENT_UID });
  await login(p, 'cliente@example.com');
  await p.getByText('Activa tu acceso').waitFor();
  await p.getByPlaceholder('NP-XXXX-XXXX').fill('NP-ABCD-EFGH-JKLM-NPQR');
  await p.screenshot({ path: `${OUT}/09-codigo-oscuro.png` });
  await p.getByRole('button', { name: 'Activar' }).click();
  await p.getByText('Antes de empezar').waitFor();
  await p.getByPlaceholder('Tu nombre').fill('Mario');
  await p.getByPlaceholder('Tus apellidos').fill('Prueba');
  await p.screenshot({ path: `${OUT}/10-cuestionario-oscuro.png` });
  for (let i = 0; i < 3; i++) await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('button', { name: 'Empezar' }).click();
  await p.getByText('Te quedan').first().waitFor();
  ok(db.nutriplan_client_onboarding[0]?.completed_at, 'cuestionario guardado y completado');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/11-hoy-oscuro.png` });
  await c.close();
}

// ---------- 2b. Alta: el consentimiento es obligatorio ----------
{
  const db = seed({ linked: false });
  const { c, p } = await ctx();
  await install(p, db, { uid: CLIENT_UID });
  await p.goto(BASE);
  await p.getByRole('radio', { name: 'Crear cuenta' }).click();
  await p.getByPlaceholder('tu@correo.com').fill('nuevo@example.com');
  await p.getByPlaceholder('Mínimo 8 caracteres').fill('secreto123');
  await p.getByRole('button', { name: 'Crear mi cuenta' }).click();
  ok(await p.getByText('acepta la información de privacidad').isVisible(), 'sin consentimiento no se crea la cuenta');
  await p.getByRole('checkbox').check();
  await p.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await p.getByText('Activa tu acceso').waitFor();
  ok(true, 'con consentimiento se crea la cuenta');
  await c.close();
}

// ---------- 3. Coach: panel, detalle, ficha, acceso ----------
for (const [w, h, tag] of [
  [390, 844, 'movil'],
  [1366, 900, 'escritorio'],
]) {
  const db = seed();
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'es-ES' });
  const p = await c.newPage();
  p.on('pageerror', (e) => {
    console.log('PAGE ERROR', e.message);
    failures++;
  });
  const writes = await install(p, db, { uid: OWNER });
  await login(p, 'coach@example.com');
  await p.getByText('NutriPlan Coach').waitFor();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/20-coach-panel-${tag}.png` });
  await p.getByRole('button', { name: /Mario Prueba/ }).click();
  await p.getByText('Calorías · 14 días').waitFor();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/21-coach-resumen-${tag}.png`, fullPage: true });
  await p.getByRole('button', { name: 'Diario', exact: true }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/22-coach-diario-${tag}.png` });
  await p.getByRole('button', { name: 'Plan', exact: true }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/23-coach-plan-${tag}.png`, fullPage: true });
  if (tag === 'movil') {
    // Editar el plan publicado: notas para el cliente editables, sin perder combinaciones ni intercambios
    await p.getByRole('button', { name: 'Editar' }).click();
    await p.getByText('Notas para el cliente').waitFor();
    await p.getByRole('textbox', { name: 'Texto de la nota Reglas de productos' }).fill('Arroz siempre pesado en crudo.\n\nBebe 2 litros de agua.');
    await p.getByRole('button', { name: 'Añadir nota' }).click();
    await p.getByRole('textbox', { name: 'Texto de la nota Nota' }).fill('Entreno: come la opción B de comida.');
    await p.screenshot({ path: `${OUT}/23b-coach-editor-${tag}.png`, fullPage: true });
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: /Publicar para/ }).click();
    await p.waitForTimeout(800);
    const mp = db.nutriplan_published_plans.find((x) => x.client_id === 'c-mario').content;
    const comida = mp.groups.find((g) => g.name === 'Comida');
    ok(mp.coachNotes?.length === 2 && mp.coachNotes[0].lines.join('|') === 'Arroz siempre pesado en crudo.|Bebe 2 litros de agua.' && mp.coachNotes[1].lines[0].startsWith('Entreno'), 'notas para el cliente editadas por el coach');
    ok(comida.options[1].kit?.slots.length === 2 && comida.options[0].items[0].choices[0].name === comida.options[0].items[0].name && comida.options[0].items[0].choices.length === 2, 'al reeditar se conservan combinaciones e intercambios (formato clásico)');
    ok(db.nutriplan_published_plans.find((x) => x.client_id === 'c-mario').client_uid, 'al reeditar se conserva el vínculo con el cliente');
  }
  await p.getByRole('button', { name: 'Ficha', exact: true }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/24-coach-ficha-${tag}.png`, fullPage: true });
  if (tag === 'movil') {
    const weight = p.locator('label', { hasText: 'Peso' }).locator('input');
    await weight.fill('80');
    await p.getByRole('button', { name: 'Guardar ficha' }).click();
    await p.waitForTimeout(500);
    const pay = db.nutriplan_private_store[0].payload;
    ok(pay.clients[0].weight === '80', 'ficha guardada en private_store');
    ok(pay.legacyFieldKeep === 'no-borrar' && pay.clients.length === 3, 'se conservan los demás datos del coach');
    p.once('dialog', (d) => d.accept());
    await p.getByRole('button', { name: 'Enviar objetivo a su app' }).click();
    await p.waitForTimeout(600);
    const t = db.nutriplan_published_plans[0].content.target;
    ok(t.kcal > 1500 && t.kcal < 3500 && db.nutriplan_published_plans[0].content.groups.length === 3, 'objetivo enviado sin perder el plan (' + t.kcal + ' kcal)');
    // Invitación para Pablo (sin acceso)
    await p.goto(BASE);
    await p.getByRole('button', { name: /Pablo Ruiz/ }).click();
    await p.getByRole('button', { name: 'Acceso', exact: true }).click();
    await p.getByRole('button', { name: 'Generar código' }).click();
    await p.getByText(/^NP-/).waitFor();
    await p.screenshot({ path: `${OUT}/25-coach-acceso-${tag}.png` });
    ok(db.nutriplan_invitations.length === 1 && /^[0-9a-f]{64}$/.test(db.nutriplan_invitations[0].token_hash), 'invitación guardada con hash');
    ok(db.nutriplan_published_plans.some((x) => x.client_id === 'c-pablo' && x.content.diaryOnly && x.content.target.kcal > 0), 'plan solo-diario con objetivo calculado');
    ok(!writes.some((x) => x.table === 'nutriplan_meal_logs'), 'el coach no modifica registros del cliente');
    // Importar PDF (opcional: PDF=/ruta/al.pdf, no se suben PDFs reales al repositorio)
    if (process.env.PDF) {
      await p.getByRole('button', { name: 'Plan', exact: true }).click();
      await p.locator('input[type=file]').setInputFiles(process.env.PDF);
      await p.getByText('Objetivo diario').waitFor({ timeout: 30000 });
      const report = await p.locator('text=/\\d+ comidas · \\d+ opciones/').first().textContent();
      console.log('   informe:', report);
      const complete = await p.getByText('Macros completos').isVisible();
      if (!complete) {
        // Formato «menú»: lo que falte se completa a mano en el editor (aquí con valores de prueba)
        // las filas dejan de estar marcadas al completarse: rellenar siempre la primera casilla vacía
        for (let guard = 0; guard < 400; guard++) {
          const cells = p.locator('tr.bg-carb\\/10 input[inputmode=decimal]');
          if (!(await cells.count())) break;
          let filled = false;
          for (let k = 0; k < (await cells.count()); k++) {
            if (!(await cells.nth(k).inputValue())) {
              await cells.nth(k).fill('10');
              filled = true;
              break;
            }
          }
          if (!filled) break;
        }
        await p.waitForTimeout(300);
      }
      ok(await p.getByText('Macros completos').isVisible(), 'PDF importado y macros completos (' + (complete ? 'automático' : 'tras completar a mano') + ')');
      await p.screenshot({ path: `${OUT}/26-coach-pdf-${tag}.png` });
      p.once('dialog', (d) => d.accept());
      await p.getByRole('button', { name: /Publicar para/ }).click();
      await p.waitForTimeout(800);
      const pub = db.nutriplan_published_plans.find((x) => x.client_id === 'c-pablo');
      ok(pub.content.groups.length >= 1 && pub.content.planType === 'alternative-tracker-v1' && db.nutriplan_diet_drafts.some((x) => x.client_id === 'c-pablo'), 'dieta del PDF publicada (' + pub.content.groups.length + ' comidas)');
      const kits = pub.content.groups.flatMap((g) => g.options).filter((o) => o.kit).length;
      const swaps = pub.content.groups.flatMap((g) => g.options.flatMap((o) => o.items)).filter((i) => i.choices?.length > 1).length;
      console.log(`   publicado: ${kits} opciones con combinaciones, ${swaps} alimentos intercambiables, ${pub.content.coachNotes?.length || 0} notas del coach`);
      const badAlt = pub.content.groups.flatMap((g) => g.options.flatMap((o) => o.items.flatMap((i) => (i.choices || []).filter((c) => !Number.isFinite(c.kcal)).map((c) => `${g.name} ${o.letter}: ${i.name} → ${c.name}`))));
      ok(!badAlt.length, 'intercambios publicados con sus macros' + (badAlt.length ? ' · ' + badAlt.slice(0, 3).join(' | ') : ''));
    }
  }
  await c.close();
}

await browser.close();
server.kill();
console.log(failures ? `\n${failures} fallos` : '\nTodo OK');
process.exit(failures ? 1 : 0);
