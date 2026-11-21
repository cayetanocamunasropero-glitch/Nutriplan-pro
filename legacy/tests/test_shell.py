import json, re, time, sys
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

OWNER = '9b3479bd-128a-464b-844f-bb49892affec'
CLIENT = '11111111-2222-3333-4444-555555555555'
HTML = open('/tmp/served.html', encoding='utf-8').read()
TUT_JS = open('/home/claude/in/zip/Traspaso_Claude_Cayetano_2026-11-19/04_NutriPlan/Codigo_actual/nutriplan-tutorial.js', encoding='utf-8').read()
TUT_CSS = open('/home/claude/in/zip/Traspaso_Claude_Cayetano_2026-11-19/04_NutriPlan/Codigo_actual/nutriplan-tutorial.css', encoding='utf-8').read()
DB = {'logs': {}}
PLAN = {'client_id': 'c1', 'owner_id': OWNER, 'client_uid': CLIENT, 'client_name': 'Cliente Prueba',
        'content': {'groups': [], 'target': {'kcal': 2200, 'c': 250, 'p': 150, 'f': 70}, 'diaryOnly': True},
        'published_at': '2026-11-19T10:00:00Z'}
errors = []

def handler(user):
    def h(route):
        req = route.request; u = urlparse(req.url); q = parse_qs(u.query)
        if req.url.startswith('file:'): return route.continue_()
        if u.netloc in ('np.test','nutriplan-asesoria.vercel.app'):
            if u.path == '/':
                return route.fulfill(status=200, content_type='text/html', body=HTML, headers={'Access-Control-Allow-Origin':'*'})
            if u.path == '/nutriplan-tutorial.js': return route.fulfill(body=TUT_JS, content_type='text/javascript')
            if u.path == '/nutriplan-tutorial.css': return route.fulfill(body=TUT_CSS, content_type='text/css')
            if u.path == '/api/foods':
                prods = [{'code': '8480000123456', 'product_name': 'Copos de avena integral', 'brands': 'Hacendado',
                          'nutriments': {'energy-kcal_100g': 372, 'carbohydrates_100g': 59, 'proteins_100g': 13.5, 'fat_100g': 7.5}}]
                return route.fulfill(status=200, content_type='application/json', body=json.dumps({'products': prods}), headers={'Access-Control-Allow-Origin':'*'})
            return route.fulfill(status=404, body='')
        if 'supabase.co' in u.netloc:
            p = u.path
            if p.startswith('/auth/v1/token'):
                return route.fulfill(status=200, content_type='application/json', body=json.dumps({
                    'access_token': 'x', 'refresh_token': 'y', 'expires_at': int(time.time()) + 36000,
                    'user': {'id': user, 'email': 'a@b.c'}}))
            if p.startswith('/auth/v1/'): return route.fulfill(status=200, content_type='application/json', body='{}')
            t = p.replace('/rest/v1/', '')
            if t == 'nutriplan_published_plans' and req.method == 'GET':
                return route.fulfill(status=200, content_type='application/json', body=json.dumps([PLAN]))
            if t == 'nutriplan_client_onboarding' and req.method == 'GET':
                return route.fulfill(status=200, content_type='application/json', body=json.dumps([{'form': {'firstName': 'A'}, 'completed_at': '2026-11-01', 'tutorial_seen': ['__opened', 'welcome', 'profile', 'plan', 'register', 'water', 'weight', 'scanner', 'macros', 'privacy', 'access']}]))
            if t == 'nutriplan_private_store' and req.method == 'GET':
                return route.fulfill(status=200, content_type='application/json', body=json.dumps([{'payload': {'clients': [{'id': 'c1', 'name': 'Cliente Prueba', 'age': 25, 'sex': 'male', 'weight': 75, 'height': 178, 'activity': '1.55', 'goal': '0', 'formula': 'revised', 'carbPct': 50, 'proteinPct': 25, 'fatPct': 25, 'targetKcal': ''}], 'foods': [], 'plans': {}, 'templates': []}}]))
            if t == 'nutriplan_meal_logs':
                if req.method == 'GET':
                    rows = list(DB['logs'].values())
                    d = q.get('log_date', [''])[0]
                    if d.startswith('eq.'): rows = [r for r in rows if r['log_date'] == d[3:]]
                    rows.sort(key=lambda r: r['log_date'], reverse=True)
                    return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
                if req.method == 'POST':
                    b = json.loads(req.post_data); DB['logs'][b['log_date']] = b
                    return route.fulfill(status=201, body='')
            if req.method == 'GET':
                return route.fulfill(status=200, content_type='application/json', body='[]')
            return route.fulfill(status=204, body='')
        return route.fulfill(status=200, body='')
    return h

def login(page):
    page.goto('file:///home/claude/work/apk/index.html')
    page.wait_for_selector('#login', state='visible', timeout=15000)
    page.fill('#email', 'a@b.c'); page.fill('#password', 'xxxxxxxx'); page.click('#login')

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # ---------- CLIENTE ----------
    ctx = br.new_context(viewport={'width': 400, 'height': 860}, device_scale_factor=2)
    ctx.route('**/*', handler(CLIENT))
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append('client: ' + str(e)))
    login(page)
    page.wait_for_selector('#npSimple .npd-ring', timeout=15000)
    page.evaluate("document.querySelectorAll('.np-guide-overlay,.np-guide-overlay-custom,#npIntro').forEach(e=>e.remove())")
    page.wait_for_timeout(1500)
    page.screenshot(path='/home/claude/work/shot_1_vacio.png')
    def add(slot, query, grams, remote=False):
        page.click(f'#npSimple [data-npd="add"][data-slot="{slot}"]')
        page.fill('#npdQuery', query)
        if remote:
            page.click('[data-npd="remote"]'); page.wait_for_selector('[data-npd="pick"][data-from="remote"]')
            page.click('[data-npd="pick"][data-from="remote"]')
        else:
            page.click('[data-npd="pick"][data-from="local"] >> nth=0')
        page.fill('#npdGrams', str(grams))
        if slot == 'Desayuno' and query == 'avena': page.screenshot(path='/home/claude/work/shot_2_anadir.png')
        page.click('[data-npd="confirm"]')
        page.wait_for_selector('#npdSheet.hide', state='attached', timeout=8000)
    page.click('#npSimple [data-npd="add"][data-slot="Desayuno"]'); page.fill('#npdQuery', 'pech'); page.wait_for_timeout(200)
    page.screenshot(path='/home/claude/work/shot_buscar.png'); page.click('button[data-npd="close"]')
    add('Desayuno', 'avena', 60, remote=True)
    add('Desayuno', 'leche semi', 250)
    add('Desayuno', 'platano', 120)
    add('Comida', 'arroz blanco cocido', 200)
    add('Comida', 'pechuga de pollo a la plancha', 180)
    add('Comida', 'aceite de oliva', 10)
    page.wait_for_timeout(1500)
    page.screenshot(path='/home/claude/work/shot_3_rueda.png', full_page=True)
    page.click('#npSimple [data-npd="ring"]'); page.wait_for_timeout(700)
    page.screenshot(path='/home/claude/work/shot_4_macros.png')
    page.click('#npSimple [data-npd="water"][data-ml="250"]'); page.wait_for_timeout(500)
    # dia anterior y vuelta
    page.click('#npSimple [data-npd="prev"]'); page.wait_for_timeout(800)
    add('Cena', 'tortilla francesa', 120)
    page.click('#npSimple [data-npd="next"]'); page.wait_for_timeout(800)
    kc = page.inner_text('#npSimple .npd-ring-in strong')
    print('kcal hoy en rueda:', kc)
    ctx.close()
    print('origen:', page.evaluate('location.href'), page.evaluate('window.NP_APP'), page.evaluate('localStorage.getItem("np-shell-html")!==null'))
    page.screenshot(path='/home/claude/work/shot_apk.png')
    br.close()
    print('LOGS', len(DB['logs']), 'ERRORES', errors)
    raise SystemExit
    # ---------- COACH ----------
    ctx = br.new_context(viewport={'width': 1200, 'height': 1000})
    ctx.route('**/*', handler(OWNER))
    page = ctx.new_page(); page.on('pageerror', lambda e: errors.append('coach: ' + str(e)))
    login(page)
    page.wait_for_selector('[data-client="c1"]', timeout=15000)
    page.evaluate("document.querySelectorAll('.np-guide-overlay,.np-guide-overlay-custom,#npIntro').forEach(e=>e.remove())")
    page.wait_for_timeout(1500); page.evaluate("document.querySelectorAll('.np-guide-overlay,.np-guide-overlay-custom').forEach(e=>e.remove())"); page.click('[data-client="c1"]'); page.wait_for_timeout(800)
    page.screenshot(path='/home/claude/work/dbg_coach.png')
    print('tabs visibles', page.evaluate("[...document.querySelectorAll('.tab[data-tab=tracking]')].map(e=>e.offsetParent!==null)"))
    page.evaluate("document.querySelector('.tab[data-tab=tracking]').click()")
    page.wait_for_selector('.npd-cday', timeout=8000); page.wait_for_timeout(500)
    page.locator('#tracking').screenshot(path='/home/claude/work/shot_5_coach.png')
    print('target ficha:', page.evaluate("1"))
    ctx.close(); br.close()
print('LOGS', json.dumps({k: [(e.get('mealSlot'), e['items'][0]['name'], e['items'][0]['grams']) for e in v['entries']] for k, v in DB['logs'].items()}, ensure_ascii=False))
print('agua', {k: v['water_ml'] for k, v in DB['logs'].items()})
print('ERRORES', errors)
