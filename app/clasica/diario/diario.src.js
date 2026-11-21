/* ===== NutriPlan · Diario sencillo (cliente) y registros por días (coach) ===== */
var NPD_FOODS=__FOODS__.split('\n').filter(Boolean).map(function(l,i){var x=l.split('|');return {id:'b'+i,name:x[0],kcal:+x[1],c:+x[2],p:+x[3],f:+x[4],portion:+x[5]||100,portionLabel:x[6]||'',source:'Biblioteca NutriPlan'}});
var NPD_SLOTS=['Desayuno','Media mañana','Comida','Merienda','Cena','Recena'];
var npdDay=null,npdOpen=false,npdSheet=null,npdLast=0;
function npdToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function npdShift(iso,n){var d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function npdPretty(iso){var t=npdToday();if(iso===t)return 'Hoy';if(iso===npdShift(t,-1))return 'Ayer';var d=new Date(iso+'T12:00:00');var s=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});return s.charAt(0).toUpperCase()+s.slice(1)}
function npdN(v){return Math.round(Number(v)||0).toLocaleString('es-ES')}
function npdN1(v){return (Math.round((Number(v)||0)*10)/10).toLocaleString('es-ES')}
function npdNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function npdItemMacros(i){var g=Number(i.grams)||0;return {kcal:(+i.kcal||0)*g/100,c:(+i.c||0)*g/100,p:(+i.p||0)*g/100,f:(+i.f||0)*g/100}}
function npdSlotOf(e){if(e.freeEntry)return e.mealSlot||'Otra';var m=String(e.meal||'');for(var i=0;i<NPD_SLOTS.length;i++){if(npdNorm(m).indexOf(npdNorm(NPD_SLOTS[i]))===0)return NPD_SLOTS[i]}return m||'Otra'}
function npdTarget(){var c=(trackerPlan&&trackerPlan.content)||{};var t=c.target||c.targets||{};return {kcal:+t.kcal||0,c:+t.c||0,p:+t.p||0,f:+t.f||0}}
function npdRecents(){try{return JSON.parse(localStorage.getItem('npd-recents')||'[]')}catch(e){return []}}
function npdRemember(food){try{var r=npdRecents().filter(function(x){return x.name!==food.name});r.unshift({name:food.name,kcal:food.kcal,c:food.c,p:food.p,f:food.f,portion:food.portion,portionLabel:food.portionLabel||'',brand:food.brand||'',source:food.source||''});localStorage.setItem('npd-recents',JSON.stringify(r.slice(0,25)))}catch(e){}}

function npdMount(){
 var main=$('npClientMain');if(!main||$('npSimple'))return;
 var box=document.createElement('div');box.id='npSimple';main.insertBefore(box,main.firstChild);
 box.addEventListener('click',npdClick);
 var sheet=document.createElement('div');sheet.id='npdSheet';sheet.className='npd-sheet hide';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
 sheet.innerHTML='<div class="npd-sheet-bg" data-npd="close"></div><div class="npd-sheet-card"><div id="npdSheetBody"></div></div>';
 document.body.appendChild(sheet);sheet.addEventListener('click',npdClick);sheet.addEventListener('input',npdInput);
 npdDraw();
}
function npdDraw(){
 var box=$('npSimple');if(!box)return;
 if(!trackerPlan){box.innerHTML='<div class="npd-card npd-empty"><h2>Tu diario de comidas</h2><p>Para empezar, vincula tu cuenta con el código que te ha enviado tu coach por WhatsApp.</p></div>';return}
 if(!npdDay)npdDay=$('trackerDate')&&$('trackerDate').value||npdToday();
 var entries=(trackerEntries||[]).filter(function(e){return e&&e.kind!=='activity'&&e.status!=='skipped'});
 var tot=trackerSum(entries),goal=npdTarget(),pct=goal.kcal?Math.min(100,100*tot.kcal/goal.kcal):0,over=goal.kcal&&tot.kcal>goal.kcal*1.05,left=goal.kcal-tot.kcal;
 var slots=NPD_SLOTS.slice();entries.forEach(function(e){var s=npdSlotOf(e);if(slots.indexOf(s)<0)slots.push(s)});
 var html='<div class="npd-top"><button type="button" class="npd-nav" data-npd="prev" aria-label="Día anterior">‹</button><div class="npd-date"><b>'+h(npdPretty(npdDay))+'</b><small>'+h(new Date(npdDay+'T12:00:00').toLocaleDateString('es-ES'))+'</small></div><button type="button" class="npd-nav" data-npd="next" aria-label="Día siguiente"'+(npdDay>=npdToday()?' disabled':'')+'>›</button></div>';
 html+='<div class="npd-card npd-summary"><button type="button" class="npd-ring'+(over?' over':'')+'" data-npd="ring" data-pct="'+pct.toFixed(1)+'" style="--pct:'+npdLast+'%" aria-expanded="'+npdOpen+'" aria-label="Ver hidratos, proteínas y grasas"><span class="npd-ring-in"><strong>'+npdN(tot.kcal)+'</strong><small>kcal comidas</small>'+(goal.kcal?'<em>'+(left>=0?'Te quedan '+npdN(left):'+'+npdN(-left)+' sobre objetivo')+'</em>':'<em>Toca para ver macros</em>')+'</span></button>';
 html+='<div class="npd-goal">'+(goal.kcal?'Objetivo <b>'+npdN(goal.kcal)+' kcal</b>':'Sin objetivo de kcal')+'<span>Toca el círculo para ver tus macros</span></div>';
 var mac=[['Hidratos','c','#e9b43c'],['Proteínas','p','#2e6648'],['Grasas','f','#f4a261']];
 html+='<div class="npd-macros'+(npdOpen?' open':'')+'" id="npdMacros">'+mac.map(function(m){var v=tot[m[1]],g=goal[m[1]],w=g?Math.min(100,100*v/g):0;return '<div class="npd-macro"><div class="npd-macro-head"><span><i style="background:'+m[2]+'"></i>'+m[0]+'</span><b>'+npdN1(v)+' g'+(g?' <small>/ '+npdN(g)+' g</small>':'')+'</b></div>'+(g?'<div class="npd-track"><span style="width:'+w.toFixed(1)+'%;background:'+m[2]+'"></span></div>':'')+'</div>'}).join('')+'<p class="npd-hint">Cantidades ingeridas según lo que has anotado hoy.</p></div></div>';
 slots.forEach(function(slot){
  var list=entries.filter(function(e){return npdSlotOf(e)===slot}),st=trackerSum(list);
  html+='<div class="npd-card npd-meal"><div class="npd-meal-head"><h3>'+h(slot)+'</h3><span>'+npdN(st.kcal)+' kcal</span></div>';
  list.forEach(function(e){(e.items||[]).forEach(function(it,ix){var m=npdItemMacros(it);if(!(+it.grams>0))return;
   html+='<div class="npd-food"><div><b>'+h(it.name)+'</b><small>'+npdN1(it.grams)+' '+(/leche|zumo|bebida|cerveza|vino|refresco|batido|kéfir|kefir/i.test(it.name)?'ml':'g')+' · HC '+npdN1(m.c)+' · P '+npdN1(m.p)+' · G '+npdN1(m.f)+'</small></div><div class="npd-food-r"><span>'+npdN(m.kcal)+'</span>'+(e.freeEntry?'<button type="button" class="npd-x" data-npd="edit" data-id="'+h(e.id)+'" aria-label="Cambiar cantidad">✎</button><button type="button" class="npd-x" data-npd="del" data-id="'+h(e.id)+'" aria-label="Eliminar">×</button>':'')+'</div></div>'})});
  html+='<button type="button" class="npd-add" data-npd="add" data-slot="'+h(slot)+'">+ Añadir alimento</button></div>';
 });
 var water=Number(typeof trackerDayWater!=='undefined'?trackerDayWater:0)||0;
 html+='<div class="npd-card npd-water"><div><h3>Agua</h3><small>'+npdN(water)+' ml hoy</small></div><div class="npd-water-b"><button type="button" class="soft" data-npd="water" data-ml="-250">−</button><button type="button" data-npd="water" data-ml="250">+ 250 ml</button></div></div>';
 html+='<p id="npdStatus" class="small" role="status"></p><button type="button" class="ghost npd-more" data-npd="more">Ver mi dieta, actividad, peso y más opciones</button>';
 box.innerHTML=html;
 var ring=box.querySelector('.npd-ring');requestAnimationFrame(function(){requestAnimationFrame(function(){if(ring){var p=+ring.dataset.pct||0;ring.style.setProperty('--pct',p+'%');npdLast=p}})});
}
function npdStatus(t,err){var s=$('npdStatus');if(s){s.textContent=t;s.className='small '+(err?'error':'success')}}
async function npdSetDay(d){npdDay=d;if($('trackerDate'))$('trackerDate').value=d;npdLast=0;npdDraw();try{await trackerClientLoad()}catch(e){}npdDraw()}
async function npdSave(entries,okText){
 if($('trackerDate'))$('trackerDate').value=npdDay;
 try{await trackerPersist(entries);npdDraw();npdStatus(okText||'Guardado ✓')}catch(e){npdStatus('No se pudo guardar: '+e.message,true);throw e}
}
function npdClick(ev){
 var b=ev.target.closest('[data-npd]');if(!b)return;var a=b.dataset.npd;
 if(a==='prev')return npdSetDay(npdShift(npdDay,-1));
 if(a==='next'){if(npdDay<npdToday())npdSetDay(npdShift(npdDay,1));return}
 if(a==='ring'){npdOpen=!npdOpen;var m=$('npdMacros');if(m)m.classList.toggle('open',npdOpen);b.setAttribute('aria-expanded',npdOpen);return}
 if(a==='more'){var c=$('client');c.classList.toggle('np-simple');b.textContent=c.classList.contains('np-simple')?'Ver mi dieta, actividad, peso y más opciones':'Volver al diario sencillo';if(!c.classList.contains('np-simple'))$('npSimple').scrollIntoView({behavior:'smooth'});return}
 if(a==='water'){var w=Math.max(0,(Number(trackerDayWater)||0)+Number(b.dataset.ml));if($('trackerWater'))$('trackerWater').value=w;npdSave(JSON.parse(JSON.stringify(trackerEntries||[])),'Agua guardada ✓');return}
 if(a==='add'){npdSheet={slot:b.dataset.slot,q:'',results:[],remote:[],food:null};npdSheetDraw();return}
 if(a==='del'){if(!confirm('¿Eliminar este alimento del diario?'))return;npdSave((trackerEntries||[]).filter(function(e){return e.id!==b.dataset.id}),'Alimento eliminado');return}
 if(a==='edit'){var e=(trackerEntries||[]).find(function(x){return x.id===b.dataset.id});if(!e)return;var it=e.items[0];npdSheet={slot:npdSlotOf(e),editId:e.id,q:'',results:[],remote:[],food:{name:it.name,kcal:+it.kcal,c:+it.c,p:+it.p,f:+it.f,portion:+it.grams,source:''},grams:+it.grams};npdSheetDraw();return}
 if(a==='close'){npdClose();return}
 if(a==='pick'){var list=b.dataset.from==='remote'?npdSheet.remote:npdSheet.results;npdSheet.food=list[+b.dataset.i];npdSheet.grams=npdSheet.food.portion||100;npdSheetDraw();return}
 if(a==='back'){npdSheet.food=null;npdSheetDraw();return}
 if(a==='grams'){npdSheet.grams=+b.dataset.g;var gi=$('npdGrams');if(gi)gi.value=npdSheet.grams;npdPreview();return}
 if(a==='remote'){npdRemote();return}
 if(a==='scan'){npdScan();return}
 if(a==='manual'){npdSheet.manual=true;npdSheet.food=null;npdSheetDraw();return}
 if(a==='savemanual'){npdSaveManual();return}
 if(a==='confirm'){npdConfirm();return}
}
function npdInput(ev){
 if(ev.target.id==='npdQuery'){npdSheet.q=ev.target.value;npdLocal();npdResultsDraw()}
 if(ev.target.id==='npdGrams'||ev.target.id==='npdSlot')npdPreview();
}
function npdClose(){npdStopScan();npdSheet=null;$('npdSheet').classList.add('hide');document.body.classList.remove('npd-lock')}
function npdLocal(){
 var q=npdNorm(npdSheet.q).trim(),words=q.split(/\s+/).filter(Boolean);
 var rec=npdRecents().map(function(x){x.recent=true;return x});
 if(!words.length){npdSheet.results=rec.slice(0,12);return}
 var pool=rec.concat(NPD_FOODS.filter(function(f){return !rec.some(function(r){return r.name===f.name})}));
 npdSheet.results=pool.map(function(f){var n=npdNorm(f.name+' '+(f.brand||''));var ok=words.every(function(w){return n.indexOf(w)>=0});return ok?{f:f,score:(n.indexOf(words[0])===0?0:1)+(f.recent?-2:0)+n.length/200}:null}).filter(Boolean).sort(function(a,b){return a.score-b.score}).slice(0,30).map(function(x){return x.f});
}
function npdFoodRow(f,i,from){return '<button type="button" class="npd-hit" data-npd="pick" data-from="'+from+'" data-i="'+i+'"><span><b>'+h(f.name)+'</b><small>'+(f.brand?h(f.brand)+' · ':'')+npdN(f.kcal)+' kcal · HC '+npdN1(f.c)+' · P '+npdN1(f.p)+' · G '+npdN1(f.f)+' /100 g'+(f.recent?' · Reciente':'')+'</small></span><i>+</i></button>'}
function npdResultsDraw(){
 var el=$('npdResults');if(!el)return;var s=npdSheet,html='';
 if(!s.q.trim())html+='<p class="npd-sub">'+(s.results.length?'Recientes':'Escribe para buscar en la biblioteca: arroz, pollo, yogur, plátano…')+'</p>';
 html+=s.results.map(function(f,i){return npdFoodRow(f,i,'local')}).join('');
 if(s.q.trim()&&!s.results.length)html+='<p class="npd-sub">No está en la biblioteca básica. Búscalo por marca o supermercado.</p>';
 if(s.remote.length)html+='<p class="npd-sub">Productos de marca (Open Food Facts)</p>'+s.remote.map(function(f,i){return npdFoodRow(f,i,'remote')}).join('');
 el.innerHTML=html;
}
function npdSheetDraw(){
 var s=npdSheet,body=$('npdSheetBody');$('npdSheet').classList.remove('hide');document.body.classList.add('npd-lock');
 if(s.manual){body.innerHTML='<div class="npd-sheet-head"><button type="button" class="npd-x" data-npd="back">‹</button><h3>Crear alimento</h3><button type="button" class="npd-x" data-npd="close">×</button></div><p class="npd-sub">Copia los valores por 100 g de la etiqueta.</p><div class="npd-grid"><label class="npd-wide">Nombre<input id="npdMName" maxlength="120" placeholder="Ej. Pan de espelta Hacendado"></label><label>Kcal /100 g<input id="npdMK" type="number" min="0" max="950" step="0.1"></label><label>Hidratos /100 g<input id="npdMC" type="number" min="0" max="100" step="0.1"></label><label>Proteínas /100 g<input id="npdMP" type="number" min="0" max="100" step="0.1"></label><label>Grasas /100 g<input id="npdMF" type="number" min="0" max="100" step="0.1"></label></div><button type="button" class="npd-primary" data-npd="savemanual">Continuar</button><p id="npdSheetMsg" class="small"></p>';return}
 if(s.food){var f=s.food;body.innerHTML='<div class="npd-sheet-head"><button type="button" class="npd-x" data-npd="back">‹</button><h3>'+h(f.name)+'</h3><button type="button" class="npd-x" data-npd="close">×</button></div><p class="npd-sub">'+(f.brand?h(f.brand)+' · ':'')+npdN(f.kcal)+' kcal · HC '+npdN1(f.c)+' g · P '+npdN1(f.p)+' g · G '+npdN1(f.f)+' g por 100 g'+(f.source?' · '+h(f.source):'')+'</p>'+
  '<div class="npd-grid"><label>Cantidad (g/ml)<input id="npdGrams" type="number" inputmode="decimal" min="1" max="3000" step="1" value="'+(s.grams||100)+'"></label><label>Comida<select id="npdSlot">'+NPD_SLOTS.concat(['Otra']).map(function(x){return '<option'+(x===s.slot?' selected':'')+'>'+x+'</option>'}).join('')+'</select></label></div>'+
  '<div class="npd-chips">'+(f.portion&&f.portion!==100?'<button type="button" data-npd="grams" data-g="'+f.portion+'">'+(f.portionLabel?h(f.portionLabel)+' · ':'')+npdN(f.portion)+' g</button>':'')+[50,100,150,200].map(function(g){return '<button type="button" data-npd="grams" data-g="'+g+'">'+g+' g</button>'}).join('')+'</div>'+
  '<div class="npd-preview" id="npdPreview"></div><button type="button" class="npd-primary" data-npd="confirm">'+(s.editId?'Guardar cambios':'Añadir a '+h(s.slot))+'</button><p id="npdSheetMsg" class="small"></p>';npdPreview();return}
 body.innerHTML='<div class="npd-sheet-head"><h3>Añadir a '+h(s.slot)+'</h3><button type="button" class="npd-x" data-npd="close">×</button></div><input id="npdQuery" type="search" placeholder="Buscar alimento (ej. avena, pechuga, yogur…)" autocomplete="off" value="'+h(s.q)+'"><div class="npd-tools"><button type="button" class="soft" data-npd="remote">Buscar marcas</button><button type="button" class="soft" data-npd="scan">Escanear código</button><button type="button" class="soft" data-npd="manual">Crear alimento</button></div><div id="npdScanBox" class="hide"><video id="npdVideo" playsinline muted></video><p class="npd-sub">Apunta al código de barras del envase.</p></div><p id="npdSheetMsg" class="small" role="status"></p><div id="npdResults" class="npd-results"></div>';
 npdLocal();npdResultsDraw();setTimeout(function(){var q=$('npdQuery');if(q&&!('ontouchstart' in window))q.focus()},60);
}
function npdPreview(){var f=npdSheet&&npdSheet.food,el=$('npdPreview');if(!f||!el)return;var g=Number($('npdGrams').value)||0;npdSheet.grams=g;var m=npdItemMacros({grams:g,kcal:f.kcal,c:f.c,p:f.p,f:f.f});el.innerHTML='<b>'+npdN(m.kcal)+' kcal</b><span>HC '+npdN1(m.c)+' g</span><span>P '+npdN1(m.p)+' g</span><span>G '+npdN1(m.f)+' g</span>'}
function npdOFF(p){var z=p&&p.nutriments||{};function g(){for(var i=0;i<arguments.length;i++){var v=z[arguments[i]];if(v!==null&&v!==undefined&&v!==''&&isFinite(+v)&&+v>=0)return +v}return null}
 var k=g('energy-kcal_100g','energy-kcal_100ml');if(k===null){var kj=g('energy-kj_100g','energy_100g');k=kj===null?null:kj/4.184}
 var c=g('carbohydrates_100g','carbohydrates_100ml'),pr=g('proteins_100g','proteins_100ml'),f=g('fat_100g','fat_100ml');
 if(k===null&&c!==null&&pr!==null&&f!==null)k=4*(c+pr)+9*f;
 var sv=String(p.serving_size||'').replace(',','.').match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
 return {name:String(p.product_name_es||p.product_name||'Producto sin nombre').trim().slice(0,120),brand:String(p.brands||'').split(',')[0].trim().slice(0,60),kcal:k,c:c,p:pr,f:f,portion:sv?+sv[1]:100,portionLabel:sv?'ración':'',code:String(p.code||''),source:'Open Food Facts',complete:[k,c,pr,f].every(function(v){return v!==null})}}
async function npdApi(params){var r=await fetch('/api/foods?'+new URLSearchParams(params),{headers:{Accept:'application/json'}});var v=await r.json().catch(function(){return {}});if(!r.ok)throw Error(v.error||'El buscador de marcas no responde');return v}
async function npdRemote(){var q=String(npdSheet.q||'').trim();if(q.length<2){npdMsg('Escribe primero el producto o la marca.',true);return}npdMsg('Buscando productos de marca…');
 try{var v=await npdApi({q:q});npdSheet.remote=(v.products||[]).map(npdOFF).filter(function(x){return x.complete&&x.name!=='Producto sin nombre'}).slice(0,20);npdMsg(npdSheet.remote.length?npdSheet.remote.length+' productos encontrados. Comprueba la etiqueta.':'Sin resultados de marca. Puedes crear el alimento.');npdResultsDraw()}catch(e){npdMsg(e.message,true)}}
function npdMsg(t,err){var m=$('npdSheetMsg');if(m){m.textContent=t;m.className='small '+(err?'error':'')}}
var npdStream=null,npdTimer=null;
function npdStopScan(){if(npdTimer)clearTimeout(npdTimer);npdTimer=null;if(npdStream)npdStream.getTracks().forEach(function(t){t.stop()});npdStream=null;var b=$('npdScanBox');if(b)b.classList.add('hide')}
async function npdByCode(code){npdStopScan();npdMsg('Consultando código '+code+'…');try{var v=await npdApi({barcode:code});if(!v.product)throw Error('Código no encontrado. Puedes crear el alimento.');var f=npdOFF(v.product);if(!f.complete)throw Error('Al producto le faltan valores. Créalo con la etiqueta.');npdSheet.food=f;npdSheet.grams=f.portion||100;npdSheetDraw()}catch(e){npdMsg(e.message,true)}}
async function npdScan(){
 if(!('BarcodeDetector' in window)||!navigator.mediaDevices){var c=prompt('Escribe el código de barras (8-14 cifras)');if(c&&/^\d{8,14}$/.test(c.trim()))npdByCode(c.trim());else if(c)npdMsg('Código no válido.',true);return}
 try{var det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});npdStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});var v=$('npdVideo');v.srcObject=npdStream;await v.play();$('npdScanBox').classList.remove('hide');
  var tick=async function(){if(!npdStream)return;try{var r=await det.detect(v);if(r.length){npdByCode(r[0].rawValue);return}}catch(e){}npdTimer=setTimeout(tick,350)};tick()}catch(e){npdStopScan();npdMsg('No se pudo abrir la cámara: '+e.message,true)}}
function npdSaveManual(){var name=$('npdMName').value.trim(),v=['npdMK','npdMC','npdMP','npdMF'].map(function(id){return Number($(id).value)});
 if(!name||v.some(function(x){return !isFinite(x)||x<0})||v[0]>950||v.slice(1).some(function(x){return x>100})){npdMsg('Revisa el nombre y los valores.',true);return}
 npdSheet.manual=false;npdSheet.food={name:name,kcal:v[0],c:v[1],p:v[2],f:v[3],portion:100,source:'Creado por ti'};npdSheet.grams=100;npdSheetDraw()}
async function npdConfirm(){
 var s=npdSheet,f=s.food,g=Math.round((Number($('npdGrams').value)||0)*10)/10,slot=$('npdSlot').value;
 if(!(g>0&&g<=3000)){npdMsg('Indica una cantidad válida.',true);return}
 var item={name:f.brand&&f.name.indexOf(f.brand)<0?f.name+' · '+f.brand:f.name,grams:g,kcal:+(+f.kcal).toFixed(2),c:+(+f.c).toFixed(2),p:+(+f.p).toFixed(2),f:+(+f.f).toFixed(2)};
 if(f.code)item.code=f.code;if(f.source)item.source=f.source;
 var rows=JSON.parse(JSON.stringify(trackerEntries||[]));
 if(s.editId){var e=rows.find(function(x){return x.id===s.editId});if(e){e.items[0].grams=g;e.mealSlot=slot;e.updatedAt=new Date().toISOString()}}
 else{var id=crypto.randomUUID();rows.push({id:id,freeEntry:true,meal:'Libre:'+id,mealSlot:slot,letter:'Libre',status:'completed',items:[item],updatedAt:new Date().toISOString()})}
 var btn=document.querySelector('[data-npd="confirm"]');if(btn)btn.disabled=true;
 try{await npdSave(rows,s.editId?'Cantidad actualizada ✓':item.name+' añadido ✓');if(!s.editId)npdRemember(f);npdClose()}catch(e){npdMsg('No se pudo guardar: '+e.message,true);if(btn)btn.disabled=false}
}

/* ===== Coach: registros separados por días ===== */
function npdCoachDays(rows){
 return rows.map(function(r,ri){
  var entries=(r.entries||[]).filter(function(e){return e&&e.kind!=='activity'&&e.status!=='skipped'}),tot=trackerSum(entries);
  var slots=NPD_SLOTS.slice();entries.forEach(function(e){var s=npdSlotOf(e);if(slots.indexOf(s)<0)slots.push(s)});
  var d=new Date(r.log_date+'T12:00:00'),label=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  var body=slots.map(function(slot){var list=entries.filter(function(e){return npdSlotOf(e)===slot});if(!list.length)return '';var st=trackerSum(list);
   return '<div class="npd-cmeal"><div class="npd-cmeal-h"><b>'+h(slot)+'</b><span>'+npdN(st.kcal)+' kcal · HC '+npdN1(st.c)+' · P '+npdN1(st.p)+' · G '+npdN1(st.f)+'</span></div>'+
    list.map(function(e){return (e.items||[]).filter(function(it){return +it.grams>0}).map(function(it){var m=npdItemMacros(it);return '<div class="npd-crow"><span>'+h(it.name)+' <small>'+npdN1(it.grams)+' g</small></span><span>'+npdN(m.kcal)+' kcal · HC '+npdN1(m.c)+' · P '+npdN1(m.p)+' · G '+npdN1(m.f)+'</span></div>'}).join('')+(e.comment?'<div class="npd-sub">'+h(e.comment)+'</div>':'')}).join('')+'</div>'}).join('');
  return '<details class="npd-cday"'+(ri===0?' open':'')+'><summary><span class="npd-cdate">'+h(label.charAt(0).toUpperCase()+label.slice(1))+'</span><span class="npd-ckcal">'+npdN(tot.kcal)+' kcal</span><span class="npd-cmac">HC '+npdN(tot.c)+' g · P '+npdN(tot.p)+' g · G '+npdN(tot.f)+' g</span></summary>'+
   (body||'<p class="npd-sub">Sin alimentos anotados este día.</p>')+'<p class="npd-sub">Agua: '+npdN(r.water_ml||0)+' ml'+(r.day_notes?' · Nota: '+h(r.day_notes):'')+'</p>'+(typeof npActSummary==='function'?npActSummary(r.entries):'')+'</details>'}).join('');
}
async function npdCoachRefresh(){
 var c=current();if(!c){$('trackerCoachContent').textContent='Selecciona un cliente.';return}
 $('trackerCoachContent').textContent='Consultando los registros de '+c.name+'…';
 try{var rows=await request('/rest/v1/nutriplan_meal_logs?select=log_date,entries,water_ml,day_notes,updated_at&client_id=eq.'+encodeURIComponent(c.id)+'&order=log_date.desc&limit=60');
  if(selected!==c.id)return;
  $('trackerCoachContent').innerHTML=rows.length?npdCoachDays(rows):'<div class="hint">Todavía no hay comidas registradas por este cliente. Cuando vincule su cuenta y anote un alimento, aparecerá aquí separado por días.</div>';
  msg('trackerCoachMessage',rows.length?rows.length+' días con registros':'Sin registros todavía');
 }catch(e){$('trackerCoachContent').textContent='No se pudieron consultar los registros: '+e.message}
}
function npTargetFor(c){
 if(!c)return {};var kcal=Number(c.targetKcal);
 if(!(kcal>0)){var w=+c.weight,ht=+c.height,a=+c.age,male=c.sex==='male',rev=c.formula!=='original';
  var b=rev?(male?88.362+13.397*w+4.799*ht-5.677*a:447.593+9.247*w+3.098*ht-4.330*a):(male?66.473+13.7516*w+5.0033*ht-6.755*a:655.0955+9.5634*w+1.8496*ht-4.6756*a);
  kcal=b*(+c.activity||1.55)*(1+(+c.goal||0)/100)}
 if(!(kcal>0)||!isFinite(kcal))return {};kcal=Math.round(kcal);
 return {kcal:kcal,c:Math.round(kcal*(+c.carbPct||0)/400),p:Math.round(kcal*(+c.proteinPct||0)/400),f:Math.round(kcal*(+c.fatPct||0)/900)};
}
async function npdSyncTarget(){
 var c=current();if(!c)return alert('Selecciona un cliente.');var t=npTargetFor(c);if(!t.kcal)return alert('Completa primero la ficha del cliente (peso, altura, edad, actividad y reparto de macros).');
 try{var p=await request('/rest/v1/nutriplan_published_plans?select=content&client_id=eq.'+encodeURIComponent(c.id));
  if(!p.length)return msg('trackerCoachMessage','Este cliente aún no tiene acceso. Crea su invitación en «Publicar y acceso».',true);
  var content=p[0].content||{};var old=content.target||{};
  if(old.kcal&&!confirm('Su objetivo actual es '+npdN(old.kcal)+' kcal. ¿Cambiarlo por '+npdN(t.kcal)+' kcal (HC '+t.c+' g · P '+t.p+' g · G '+t.f+' g) según su ficha?'))return;
  content.target=Object.assign({},old,t);
  await request('/rest/v1/nutriplan_published_plans?client_id=eq.'+encodeURIComponent(c.id),{method:'PATCH',prefer:'return=minimal',body:{content:content,updated_at:new Date().toISOString()}});
  msg('trackerCoachMessage','Objetivo de la rueda actualizado: '+npdN(t.kcal)+' kcal ✓');
 }catch(e){msg('trackerCoachMessage','No se pudo actualizar: '+e.message,true)}
}
document.addEventListener('click',function(ev){var t=ev.target;if(t&&t.id==='npSyncTarget')npdSyncTarget()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',npdMount);else npdMount();
