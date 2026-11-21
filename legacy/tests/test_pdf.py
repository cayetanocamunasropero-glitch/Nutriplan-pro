import json, time, glob, os, sys
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

OWNER = '9b3479bd-128a-464b-844f-bb49892affec'
BASE = '/home/claude/in/zip/Traspaso_Claude_Cayetano_2026-11-19'
HTML = open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/served.html', encoding='utf-8').read()
STORE = json.load(open(BASE + '/05_Supabase/Tablas_JSON/nutriplan_private_store.json'))
PLANS = json.load(open(BASE + '/05_Supabase/Tablas_JSON/nutriplan_published_plans.json'))
PDFJS = '/home/claude/pdfjs/package/build/'
FOODS_MOCK = json.loads(os.environ.get('FOODS_MOCK', 'null') or 'null')
log = []

def handler(route):
    req = route.request; u = urlparse(req.url); q = parse_qs(u.query)
    if 'cdnjs.cloudflare.com' in u.netloc and 'pdf.js' in u.path:
        f = 'pdf.worker.min.js' if 'worker' in u.path else 'pdf.min.js'
        return route.fulfill(body=open(PDFJS + f, 'rb').read(), content_type='text/javascript')
    if u.netloc == 'np.test':
        if u.path == '/': return route.fulfill(status=200, content_type='text/html', body=HTML)
        if u.path == '/api/foods':
            log.append(('foods', q))
            return route.fulfill(status=502, content_type='application/json', body='{"error":"x"}')
        if u.path == '/api/product':
            log.append(('product', q))
            return route.fulfill(status=502, content_type='application/json', body='{"error":"Catálogo externo no disponible."}')
        return route.fulfill(status=404, body='')
    if 'supabase.co' in u.netloc:
        p = u.path
        if p.startswith('/auth/v1/token'):
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'access_token': 'x', 'refresh_token': 'y', 'expires_at': int(time.time()) + 36000, 'user': {'id': OWNER, 'email': 'a@b.c'}}))
        if p.startswith('/auth/v1/'): return route.fulfill(status=200, content_type='application/json', body='{}')
        t = p.replace('/rest/v1/', '')
        if t == 'nutriplan_private_store' and req.method == 'GET':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(STORE))
        if t == 'nutriplan_published_plans' and req.method == 'GET':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(PLANS))
        if req.method == 'GET': return route.fulfill(status=200, content_type='application/json', body='[]')
        return route.fulfill(status=204, body='')
    return route.fulfill(status=200, body='')

pdfs = sorted(glob.glob(BASE + '/pdf_pruebas/*.pdf'))
pdfs = [p for p in pdfs if '(1)' not in p]
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = br.new_context(viewport={'width': 1300, 'height': 1000}); ctx.route('**/*', handler)
    page = ctx.new_page(); errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto('https://np.test/'); page.wait_for_selector('#login', state='visible')
    page.fill('#email', 'a@b.c'); page.fill('#password', 'xxxxxxxx'); page.click('#login')
    page.wait_for_selector('[data-client]', timeout=15000); page.wait_for_timeout(1200)
    page.evaluate("document.querySelectorAll('.np-guide-overlay,.np-guide-overlay-custom,#npIntro').forEach(e=>e.remove())")
    cid = STORE[0]['payload']['clients'][0]['id']
    page.click(f'[data-client="{cid}"]'); page.wait_for_timeout(400)
    page.evaluate("document.querySelector('.tab[data-tab=npImport]').click()")
    res = []
    for p in pdfs:
        page.set_input_files('#npPDF', p)
        page.click('#npParsePDF')
        page.wait_for_function("!document.getElementById('npParsePDF').disabled", timeout=90000)
        m = page.inner_text('#npPDFMsg')
        res.append((os.path.basename(p), m))
        if os.environ.get('SHOT') and os.path.basename(p) == os.environ['SHOT']:
            page.locator('#npImport').screenshot(path='/home/claude/work/shot_pdf.png')
    for n, m in res: print('-', n[:60], '\n   ', m)
    print('consultas catálogo:', len(log), 'errores:', errs[:3])
    br.close()
