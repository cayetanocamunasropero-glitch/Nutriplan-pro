/* ===== NutriPlan · Diario sencillo (cliente) y registros por días (coach) ===== */
var NPD_FOODS="Arroz blanco crudo|360|79|7|0.6|80|ración en crudo\nArroz blanco cocido|130|28|2.7|0.3|200|plato\nArroz integral crudo|352|72|7.5|2.7|80|ración en crudo\nArroz integral cocido|123|26|2.7|1|200|plato\nPasta seca cruda|356|72|12.5|1.5|80|ración en crudo\nPasta cocida|158|31|5.8|0.9|200|plato\nPasta integral cruda|340|64|13|2.5|80|ración en crudo\nMacarrones cocidos|158|31|5.8|0.9|200|plato\nEspaguetis cocidos|158|31|5.8|0.9|200|plato\nCuscús crudo|360|72|12.5|1|70|ración en crudo\nQuinoa cruda|368|64|14|6|70|ración en crudo\nQuinoa cocida|120|21|4.4|1.9|185|plato\nAvena en copos|375|60|13.5|7|50|ración\nHarina de avena|375|60|13.5|7|40|ración\nCorn flakes|378|84|7|0.9|30|ración\nCereales integrales de desayuno|360|70|10|3|40|ración\nMuesli|370|62|10|7|50|ración\nGranola|450|60|9|18|45|ración\nPan blanco (barra)|265|51|9|3.2|60|trozo\nPan integral|250|41|10|4|60|2 rebanadas\nPan de molde blanco|265|48|8|4|30|rebanada\nPan de molde integral|245|42|10|3.5|30|rebanada\nPan de centeno|250|46|8.5|3|40|rebanada\nTostadas de pan (biscotes)|400|72|12|6|10|unidad\nTortilla de trigo (wrap)|310|52|8.5|7|60|unidad\nPan de pita|275|56|9|1.2|60|unidad\nTortitas de arroz|387|81|8|3|8|unidad\nTortitas de maíz|380|80|8|3|8|unidad\nPatata cruda|77|17|2|0.1|200|unidad mediana\nPatata cocida|86|20|1.7|0.1|200|ración\nPatata asada|93|21|2.5|0.1|200|ración\nPatatas fritas caseras|250|33|3.4|12|150|ración\nPatatas fritas de bolsa|536|53|6.5|34|40|bolsa pequeña\nBoniato crudo|86|20|1.6|0.1|200|unidad\nBoniato asado|90|21|2|0.2|200|ración\nMaíz dulce en lata|86|16|3|1.2|80|ración\nGarbanzos cocidos|164|27|8.9|2.6|200|ración\nLentejas cocidas|116|20|9|0.4|200|ración\nAlubias cocidas|127|23|8.7|0.5|200|ración\nGuisantes cocidos|84|16|5.4|0.2|150|ración\nGarbanzos secos|364|61|19|6|70|ración en crudo\nLentejas secas|353|60|25|1.1|70|ración en crudo\nEdamame|121|9|12|5|100|ración\nHummus|177|14|8|10|50|ración\nPechuga de pollo cruda|110|0|23|1.5|150|filete\nPechuga de pollo a la plancha|165|0|31|3.6|150|filete\nMuslo de pollo asado (sin piel)|209|0|26|11|120|unidad\nPechuga de pavo cruda|105|0|24|1|150|filete\nPechuga de pavo a la plancha|135|0|30|1.5|150|filete\nFiambre de pavo|105|2|19|2|20|loncha\nJamón cocido|120|1.5|19|4|20|loncha\nJamón serrano|240|0|31|13|20|loncha\nLomo embuchado|245|1|38|10|20|loncha\nChorizo|455|2|24|39|30|ración\nSalchichón|430|1.5|26|36|30|ración\nTernera magra cruda|130|0|21|5|150|filete\nTernera a la plancha|190|0|29|8|150|filete\nCarne picada de ternera|215|0|19|15|150|ración\nCarne picada mixta|250|0|17|20|150|ración\nHamburguesa de ternera|240|1|17|19|120|unidad\nLomo de cerdo crudo|143|0|21|6.5|150|filete\nLomo de cerdo a la plancha|200|0|29|9|150|filete\nSolomillo de cerdo|120|0|21|3.5|150|ración\nCostillas de cerdo|290|0|17|25|150|ración\nSalchichas frescas de pollo|180|2|15|12|60|unidad\nSalchichas tipo Frankfurt|275|2|12|25|50|unidad\nBacon|400|1|14|38|20|loncha\nCordero|250|0|17|20|150|ración\nConejo|135|0|21|5.5|150|ración\nHuevo entero|143|0.7|12.6|9.5|60|1 unidad M\nClara de huevo|52|0.7|11|0.2|33|1 clara\nYema de huevo|322|3.6|16|27|17|1 yema\nHuevo frito|196|0.8|13.6|15|60|1 unidad\nTortilla francesa|154|0.6|11|12|120|2 huevos\nTortilla de patatas|190|14|6.5|12|150|ración\nAtún al natural (escurrido)|110|0|25|1|56|1 lata\nAtún en aceite (escurrido)|190|0|26|9|56|1 lata\nSalmón fresco|208|0|20|13|150|filete\nSalmón ahumado|180|0|22|10|50|ración\nMerluza|80|0|17|1.3|150|filete\nBacalao fresco|82|0|18|0.7|150|filete\nLubina|100|0|19|2.5|150|filete\nDorada|110|0|20|3.5|150|filete\nSardinas en lata (aceite)|210|0|25|12|80|lata\nCaballa en lata|200|0|20|13|80|lata\nGambas cocidas|99|0.2|24|0.3|100|ración\nMejillones cocidos|172|7|24|4.5|100|ración\nCalamar|92|3|16|1.4|150|ración\nSurimi (palitos de cangrejo)|95|14|7.5|0.5|50|4 palitos\nLeche entera|63|4.7|3.1|3.6|250|vaso\nLeche semidesnatada|46|4.8|3.2|1.6|250|vaso\nLeche desnatada|35|4.9|3.4|0.1|250|vaso\nBebida de avena|45|7|1|1.5|250|vaso\nBebida de soja|39|2.5|3.3|1.8|250|vaso\nBebida de almendra|24|3|0.5|1.1|250|vaso\nYogur natural|61|4.7|3.5|3.2|125|1 unidad\nYogur natural desnatado|42|5.5|4.2|0.1|125|1 unidad\nYogur griego natural|115|4|6|9|125|1 unidad\nYogur griego 0%|59|3.6|10|0.4|125|1 unidad\nYogur proteico (tipo +Proteínas)|60|4|10|0.2|120|1 unidad\nYogur de sabores|90|13|3.3|2.7|125|1 unidad\nKéfir|60|4|3.5|3.5|200|vaso\nQueso fresco batido 0%|46|3.5|8|0.2|250|tarrina\nQueso fresco tipo Burgos|180|3|12|13|60|ración\nQueso fresco tipo Burgos 0%|70|3|13|0.5|60|ración\nRequesón|100|3.5|11|4.5|100|ración\nQueso cottage|98|3.4|11|4.3|100|ración\nMozzarella|255|1|18|20|60|ración\nQueso semicurado|375|0.5|25|30|30|ración\nQueso curado|430|0.5|30|34|30|ración\nQueso en lonchas (tipo sándwich)|300|5|17|24|20|loncha\nQueso light en lonchas|230|1|30|12|20|loncha\nQueso rallado|400|1|30|30|20|cucharada colmada\nQueso de untar|230|4|6|21|20|ración\nQueso de untar light|140|6|8|9|20|ración\nMantequilla|740|0.6|0.7|82|10|ración\nNata para cocinar|195|3.5|2.5|19|50|ración\nProteína whey (polvo)|380|7|78|5|30|cacito\nCaseína (polvo)|360|8|80|1.5|30|cacito\nBatido de proteínas listo para beber|65|3|11|1|330|botella\nBarrita de proteínas|360|35|30|12|60|unidad\nAceite de oliva|884|0|0|100|10|cucharada\nAceite de girasol|884|0|0|100|10|cucharada\nMayonesa|680|1|1|75|15|cucharada\nMayonesa light|300|8|1|30|15|cucharada\nKetchup|105|24|1.2|0.2|15|cucharada\nMostaza|66|5|4|3.5|10|cucharadita\nTomate frito|85|11|1.5|4|50|ración\nSalsa boloñesa|90|7|5|5|90|ración\nPesto|450|6|5|45|20|cucharada\nSalsa de soja|60|5|8|0.1|10|cucharada\nAlmendras|579|22|21|50|30|puñado\nNueces|654|14|15|65|30|puñado\nCacahuetes tostados|585|21|24|50|30|puñado\nAnacardos|553|30|18|44|30|puñado\nPistachos|560|28|20|45|30|puñado\nCrema de cacahuete|590|20|25|50|15|cucharada\nSemillas de chía|486|42|17|31|15|cucharada\nSemillas de lino|534|29|18|42|15|cucharada\nAguacate|160|8.5|2|14.7|100|medio\nAceitunas verdes|145|4|1|15|30|ración\nPlátano|89|23|1.1|0.3|120|1 unidad\nManzana|52|14|0.3|0.2|180|1 unidad\nPera|57|15|0.4|0.1|170|1 unidad\nNaranja|47|12|0.9|0.1|180|1 unidad\nMandarina|53|13|0.8|0.3|80|1 unidad\nKiwi|61|15|1.1|0.5|75|1 unidad\nFresas|32|7.7|0.7|0.3|150|ración\nArándanos|57|14|0.7|0.3|100|ración\nUvas|69|18|0.7|0.2|150|racimo pequeño\nPiña|50|13|0.5|0.1|150|2 rodajas\nMelón|34|8|0.8|0.2|200|tajada\nSandía|30|7.6|0.6|0.2|250|tajada\nMelocotón|39|10|0.9|0.3|150|1 unidad\nMango|60|15|0.8|0.4|150|ración\nCerezas|63|16|1.1|0.2|100|ración\nDátiles|282|75|2.5|0.4|8|1 unidad\nPasas|299|79|3|0.5|30|puñado\nFrutos rojos congelados|45|9|1|0.4|100|ración\nZumo de naranja natural|45|10|0.7|0.2|200|vaso\nZumo envasado|45|10.5|0.4|0.1|200|vaso\nCompota de manzana|70|17|0.3|0.2|100|tarrina\nTomate|18|3.9|0.9|0.2|150|1 unidad\nLechuga|15|2.9|1.4|0.2|80|ración\nEnsalada mezcla (bolsa)|17|2.5|1.5|0.2|80|ración\nEspinacas|23|3.6|2.9|0.4|100|ración\nBrócoli|34|7|2.8|0.4|150|ración\nColiflor|25|5|1.9|0.3|150|ración\nJudías verdes|31|7|1.8|0.2|150|ración\nCalabacín|17|3.1|1.2|0.3|200|1 unidad\nBerenjena|25|6|1|0.2|200|1 unidad\nPimiento rojo|31|6|1|0.3|150|1 unidad\nPimiento verde|20|4.6|0.9|0.2|150|1 unidad\nCebolla|40|9|1.1|0.1|100|1 unidad\nZanahoria|41|10|0.9|0.2|80|1 unidad\nPepino|15|3.6|0.7|0.1|150|ración\nChampiñones|22|3.3|3.1|0.3|100|ración\nEspárragos|20|3.9|2.2|0.1|100|ración\nAlcachofa|47|10.5|3.3|0.2|120|ración\nVerduras para wok (congeladas)|35|6|2|0.3|150|ración\nGazpacho|40|4.5|0.8|2|250|vaso\nChocolate negro 85%|600|20|11|52|20|2 onzas\nChocolate con leche|535|57|8|30|20|2 onzas\nGalletas tipo María|440|74|7|12|8|1 unidad\nGalletas de chocolate|490|65|6|23|12|1 unidad\nMiel|304|82|0.3|0|10|cucharadita\nMermelada|250|62|0.4|0.1|15|cucharada\nMermelada sin azúcar|150|37|0.5|0.1|15|cucharada\nAzúcar|400|100|0|0|5|sobre\nCacao soluble azucarado|380|80|5|3.5|15|cucharada\nCacao puro en polvo|360|12|23|22|10|cucharada\nBollería (crusán)|420|45|8|23|60|unidad\nMagdalena|450|52|6|24|30|unidad\nHelado|210|25|3.5|11|100|bola\nPizza (casera/precocinada)|265|33|11|10|150|2 porciones\nBase de pizza|290|55|8|4|140|base\nHamburguesa completa (restaurante)|255|25|13|12|220|unidad\nKebab|215|18|13|10|300|unidad\nSushi (variado)|145|25|5|2.5|200|8 piezas\nCroquetas|240|20|7|15|30|unidad\nLasaña|135|12|7|7|300|ración\nPaella|160|21|7|5|300|plato\nCocido (garbanzos y carne)|150|10|11|7|400|plato\nLentejas con chorizo|135|13|8|5.5|350|plato\nEnsaladilla rusa|170|9|3.5|13|150|ración\nPatatas bravas|230|25|3|13|150|ración\nCerveza|43|3.6|0.5|0|330|caña/lata\nCerveza sin alcohol|26|5.5|0.3|0|330|lata\nVino tinto|85|2.6|0.1|0|150|copa\nRefresco de cola|42|10.6|0|0|330|lata\nRefresco zero|1|0|0|0|330|lata\nBebida isotónica|25|6|0|0|500|botella\nCafé solo|2|0|0.1|0|60|taza\nCafé con leche (semidesnatada)|30|2.8|2|1|200|taza\nCacao a la taza / Colacao con leche|80|11|3.5|2.4|250|vaso".split('\n').filter(Boolean).map(function(l,i){var x=l.split('|');return {id:'b'+i,name:x[0],kcal:+x[1],c:+x[2],p:+x[3],f:+x[4],portion:+x[5]||100,portionLabel:x[6]||'',source:'Biblioteca NutriPlan'}});
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
