const fs=require('node:fs'),path=require('node:path');
let html='';require('../lib/base.js')({method:'GET'},{setHeader(){},end(x){html=x}});
const DJS=fs.readFileSync(path.join(__dirname,'..','diario','diario.js'),'utf8');
const DCSS=fs.readFileSync(path.join(__dirname,'..','diario','diario.css'),'utf8');
const XJS=fs.readFileSync(path.join(__dirname,'..','diario','extra.js'),'utf8');
const PCSS=fs.readFileSync(path.join(__dirname,'..','diario','pro.css'),'utf8');
const ADD=[
 ['</head>','<style id="npd-css">'+DCSS+'</style><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#24543b"><link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-192.png"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="NutriPlan"><script>if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})</script></head>'],
 ['<section id="client" class="hide">','<section id="client" class="hide np-simple">'],
 ['async function trackerPersist(',DJS+'\nasync function trackerPersist('],
 ['trackerRenderSummary();npPlanSummary();npActDraw();\n}','trackerRenderSummary();npPlanSummary();npActDraw();npdDraw();\n}'],
 ['async function trackerCoachRefresh(){','async function trackerCoachRefresh(){return npdCoachRefresh();'],
 ['<button id="trackerCoachReload" class="soft">Actualizar registros</button>','<button id="trackerCoachReload" class="soft">Actualizar registros</button><button id="npSyncTarget" class="soft" type="button">Objetivo de la rueda desde la ficha</button>'],
 ['content:{groups:[],target:{},diaryOnly:true}','content:{groups:[],target:npTargetFor(c),diaryOnly:true}'],
 ['Bollería (crusán)','Bollería (cruasán)'],
 ['</head>','<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style id="np-pro">'+PCSS+'</style><script>try{if(localStorage.getItem("np-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}</script></head>'],
 ['async function npParseFile(file){','async function npParseFileLegacy(file){'],
 ['async function trackerPersist(',XJS+'\nasync function trackerPersist('],
 ["var rsp=await fetch('/api/product?q='+encodeURIComponent(search),{headers:{Accept:'application/json'},signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(6500):undefined});\n if(!rsp.ok)return null;\n var data=await rsp.json(),products=data.products||[],best=null,score=0;","var products=await npdCatalogProducts(search),best=null,score=0;"],
 ["source:'Catálogo Open Food Facts'+","source:(best.source||'Catálogo Open Food Facts')+"],
 ['encodeURIComponent(location.origin)','encodeURIComponent(window.NP_ORIGIN||location.origin)'],
 ['var link=location.origin+','var link=(window.NP_ORIGIN||location.origin)+']
];
for(const [a,b] of ADD){if(html.split(a).length===2)html=html.replace(a,()=>b);else console.warn('Ancla no encontrada: '+a.slice(0,50));}
module.exports=(req,res)=>{if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;return res.end('Method Not Allowed')}res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, max-age=0, must-revalidate');res.statusCode=200;res.end(req.method==='HEAD'?'':html)};
