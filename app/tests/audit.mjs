// Auditoría visual con el detector de Impeccable sobre cada pantalla (Supabase simulado).
// Uso: npm run build && node tests/audit.mjs <carpeta_capturas>
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, execFileSync } from 'node:child_process';
import { CLIENT_UID, OWNER, install, seed } from './mock.mjs';
const OUT = process.argv[2];
const server = spawn('npx', ['vite', 'preview', '--port', '4190', '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => /Local/.test(String(d)) && r()));
const BASE = 'http://localhost:4190/';
const browser = await chromium.launch({ args: ['--remote-debugging-port=9333'] });
const detect = (label, viewport) => {
  let out;
  try {
    out = execFileSync('/home/user/Nutriplan-pro/.claude/skills/impeccable/scripts/impeccable', ['detect', '--cdp', '9333', '--target', 'localhost:4190', '--json'], { encoding: 'utf8', timeout: 120000 });
  } catch (e) { out = e.stdout; }
  try {
    const f = JSON.parse(out);
    console.log(`## ${label} (${viewport}) → ${f.length} hallazgos`);
    for (const x of f) console.log('-', x.antipattern, '|', x.severity, '|', String(x.snippet || '').slice(0, 170), '|', String(x.selector || x.element || '').slice(0, 140));
  } catch (e) { console.log('parse error', label, String(out).slice(0, 300)); }
};
async function run(uid, size, label, steps) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'es-ES' });
  const p = await ctx.newPage();
  await install(p, seed(), { uid });
  await p.goto(BASE);
  await p.getByPlaceholder('tu@correo.com').fill('x@example.com');
  await p.getByPlaceholder('••••••••').fill('secreto123');
  await p.getByRole('button', { name: 'Entrar' }).click();
  for (const [name, fn] of steps) { await fn(p); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: true }); detect(`${label}:${name}`, `${size.width}x${size.height}`); }
  await ctx.close();
}
const M = { width: 390, height: 844 }, D = { width: 1366, height: 900 };
await run(CLIENT_UID, M, 'cliente', [
  ['hoy', (p) => p.getByText('kcal restantes').waitFor()],
  ['buscar', async (p) => { await p.getByRole('button', { name: 'Añadir a Comida' }).click(); await p.getByPlaceholder('Busca: pollo, avena, yogur…').fill('arroz'); }],
  ['cantidad', (p) => p.getByRole('button', { name: /Arroz blanco cocido/ }).first().click()],
  ['plan', async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.getByRole('button', { name: 'Mi plan', exact: true }).click(); }],
  ['progreso', (p) => p.getByRole('button', { name: 'Progreso', exact: true }).click()],
  ['yo', (p) => p.getByRole('button', { name: 'Yo', exact: true }).click()],
]);
await run(OWNER, D, 'coach', [
  ['panel', (p) => p.getByText('NutriPlan Coach').waitFor()],
  ['resumen', (p) => p.getByRole('button', { name: /Mario Prueba/ }).click()],
  ['diario', (p) => p.getByRole('button', { name: 'Diario', exact: true }).click()],
  ['ficha', (p) => p.getByRole('button', { name: 'Ficha', exact: true }).click()],
]);
await browser.close(); server.kill(); process.exit(0);
