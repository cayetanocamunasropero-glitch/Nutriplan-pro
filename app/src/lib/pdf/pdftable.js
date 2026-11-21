/* ===== Lector de dietas en PDF por tabla (ALIMENTO · CANT. · KCAL · HC · P · G) ===== */
function npTNum(v){v=String(v==null?'':v).trim();if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v))v=v.replace(/\./g,'');return Number(v.replace(',','.'))}
var NPT_GROUPS=[[/^desayunos?$/i,'Desayuno',20],[/^(medias?\s+ma[ñn]anas?|almuerzos?\s+de\s+media\s+ma[ñn]ana)$/i,'Media mañana',10],[/^almuerzos?$/i,'Almuerzo',10],[/^comidas?$/i,'Comida',40],[/^meriendas?$/i,'Merienda',15],[/^cenas?$/i,'Cena',25],[/^recenas?$/i,'Recena',5],[/^(pre-?entreno|pre\s+entreno)$/i,'Pre-entreno',10],[/^(post-?entreno|post\s+entreno)$/i,'Post-entreno',10],[/^snacks?$/i,'Snack',10]];
function npTGroup(s){
 var m=s.match(/^(?:\d{1,2}\s*[\/.·-]\s*)?([A-Za-zÁÉÍÓÚáéíóúñÑ-]+(?:\s+(?:de\s+)?(?:media\s+)?ma[ñn]anas?|\s+entreno)?)\s*(.*)$/);
 if(!m)return null;
 for(var g of NPT_GROUPS)if(g[0].test(m[1].trim())){
  var rest=m[2].trim();
  if(/^[A-H](\s|·|$)/.test(rest))return null;              // "Desayunos B 579 …" (filas de resumen)
  if(/\d[\d.,]*\s+\d[\d.,]*\s+\d/.test(rest))return null;    // filas con varias cifras
  return {name:g[1],share:g[2]};
 }
 return null;
}
var NPT_QTY=/^(\d{1,4}(?:[.,]\d+)?)\s*(g|ml|gr|uds?\.?|unidad(?:es)?)$/i, NPT_NUM=/^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^-?\d+(?:[.,]\d+)?$/;
var NPT_NOTE=/^(alternativa|alternativas|o bien|o\s*:|sustituci[oó]n|sustituye|cambio|variante)s?\b\s*:?/i;
var NPT_EQUIV=/^(aprox\.?|aproximadamente|equivale|\d+\s*(vaso|bol|bowl|cucharad|lata|unidad|rebanad|tostad|pieza|pu[ñn]ado|taza)|un[ao]?\s+(vaso|bol|lata|pieza|puñado|taza)|1\s+bol)/i;
function npTLines(items){
 var lines=[];
 for(var it of items){if(!it.str||!it.str.trim())continue;var x=it.x,y=it.y,line=lines.find(l=>Math.abs(l.y-y)<2.6);if(!line){line={y:y,segs:[]};lines.push(line)}line.segs.push({x:x,t:it.str.trim()})}
 lines.sort((a,b)=>b.y-a.y);
 for(var l of lines){l.segs.sort((a,b)=>a.x-b.x);
  // separar celdas: une fragmentos muy próximos y parte por espacios amplios
  var cells=[];for(var sg of l.segs){for(var part of sg.t.split(/\s{2,}/)){if(part)cells.push({x:sg.x,t:part})}}
  l.cells=cells;l.text=cells.map(c=>c.t).join(' ').replace(/\s+/g,' ').trim()}
 return lines;
}
// Extrae de una línea la fila numérica: cantidad + unidad seguida de 4 cifras (kcal, HC, P, G). Devuelve {left, qty, unit, vals}
function npTRow(text){
 var tokens=text.replace(/(\d)\s*(g|ml)\b/gi,'$1 $2').split(/\s+/);
 for(var i=tokens.length-6;i>=0;i--){
  var q=tokens[i],u=tokens[i+1];
  if(!/^\d{1,4}(?:[.,]\d+)?$/.test(q)||!/^(g|ml|gr|ud|uds|unidad|unidades)\.?$/i.test(u))continue;
  var nums=tokens.slice(i+2,i+6);
  if(nums.length===4&&nums.every(n=>NPT_NUM.test(n))&&tokens.length===i+6){
   return {left:tokens.slice(0,i).join(' ').trim(),qty:npTNum(q),unit:u.toLowerCase().replace('gr','g').replace(/\.$/,''),vals:nums.map(npTNum)};
  }
 }
 return null;
}
function npTableParse(pages){
 var out=[],group=null,option=null,pendingName='',lastItem=null,altOpen=false,target=null,inTable=false;
 function newGroup(g){group=out.find(z=>z.name===g.name);if(!group){group={name:g.name,share:g.share,options:[]};out.push(group)}option=null;inTable=false}
 for(var p=0;p<pages.length;p++){
  var lines=npTLines(pages[p]);
  for(var li=0;li<lines.length;li++){
   var s=lines[li].text;if(!s)continue;
   if(/^(p[áa]g\.?|nutriplan|cayetano|plan nutricional|documento|propuesta|cantidades en gramos)/i.test(s)||/\bP[ÁA]G\.?\s*\d+$/i.test(s))continue;
   // Objetivo diario: "2.900 kcal 399 g 181 g 64 g" o "2.900 399 g 181 g 64 g"
   var tg=s.match(/^([\d.]{3,6})\s*(?:kcal)?\s+(\d{1,4})\s*g\s+(\d{1,4})\s*g\s+(\d{1,3})\s*g$/i);
   if(tg&&!target&&npTNum(tg[1])>=800){target={kcal:npTNum(tg[1]),c:+tg[2],p:+tg[3],f:+tg[4]};continue}
   var tg2=s.match(/(?:objetivo|total\s+diario|meta)\s*[:·-]?\s*([\d.,]+)\s*kcal\s*[·|,\s]+HC\s*([\d.,]+)\s*g\s*[·|,\s]+P\s*([\d.,]+)\s*g\s*[·|,\s]+G\s*([\d.,]+)\s*g/i);
   if(tg2&&!target){target={kcal:npTNum(tg2[1]),c:npTNum(tg2[2]),p:npTNum(tg2[3]),f:npTNum(tg2[4])};continue}
   var g=npTGroup(s);if(g){newGroup(g);continue}
   var oh=s.match(/^(?:opci[oó]n|alternativa|men[uú])\s+([A-H1-9])(?:\s*[·:.\-–—]\s*|\s+)(.*?)(?:\s+([\d.]+)\s*kcal)?$/i);
   if(oh&&group&&!/^(combinaciones|variantes|resumen)/i.test(oh[2])){
    var letter=oh[1].toUpperCase();
    var dup=group.options.find(o=>o.letter===letter);
    if(dup&&dup.items.length){option=null;inTable=false;continue}
    if(dup)group.options.splice(group.options.indexOf(dup),1);
    option={letter:letter,title:oh[2].trim()||('Opción '+letter),items:[],notes:'',pdfKcal:oh[3]?npTNum(oh[3]):null};
    group.options.push(option);pendingName='';lastItem=null;altOpen=false;inTable=true;continue
   }
   if(!option||!inTable)continue;
   if(/^(alimento|ingrediente)/i.test(s)&&/kcal/i.test(s))continue; // cabecera de la tabla
   if(/^(macros|total|subtotal|diferencia)\b/i.test(s)){inTable=false;continue}
   var row=npTRow(s);
   if(row&&row.qty>0){
    var left=row.left,name=pendingName,alt='';
    var portion='';
    if(left){ if(NPT_NOTE.test(left)){alt=left.replace(NPT_NOTE,'').trim()} else if(NPT_EQUIV.test(left)||(name&&/^\d/.test(left))){portion=left} else if(!name){name=left} }
    if(!name&&left&&!NPT_NOTE.test(left)&&!/^\d/.test(left))name=left;
    if(!name)continue;
    var r=100/row.qty,v=row.vals;
    lastItem={name:name.replace(/[,·\s]+$/,'').trim(),grams:row.qty,unit:row.unit,kcal:Math.round(v[0]*r*100)/100,c:Math.round(v[1]*r*100)/100,p:Math.round(v[2]*r*100)/100,f:Math.round(v[3]*r*100)/100,reviewed:true,verified:true,source:'Datos nutricionales del PDF'};
    if(alt)lastItem.alternativesText=alt;if(portion)lastItem.portion=portion;
    option.items.push(lastItem);pendingName='';altOpen=!!alt;continue
   }
   if(NPT_NOTE.test(s)){var a=s.replace(NPT_NOTE,'').trim();var tgt=pendingName?null:lastItem;
    if(tgt){tgt.alternativesText=(tgt.alternativesText?tgt.alternativesText+' / ':'')+a}else{option._pendingAlt=a}
    altOpen=true;continue}
   if(altOpen&&lastItem&&!pendingName&&lastItem.alternativesText&&s.length<70&&!npTRow(s)&&(!/(\d\s*(g|ml)\)?|\))\s*$/i.test(lastItem.alternativesText)||/^[a-záéíóúñ(]|^g$|^\(?\d+\s*(g|ml)\)?$/.test(s))){lastItem.alternativesText+=' '+s;continue}
   altOpen=false;
   if(NPT_EQUIV.test(s)||/^[\d½⅓¼⅕]/.test(s)){ if(lastItem&&!pendingName)lastItem.portion=s; continue }
   if(pendingName&&/^[a-záéíóúñ]/.test(s)){ continue }
   if(s.length>=3&&s.length<=90&&!/\d+[.,]\d+\s*g\s*(HC|prote)/i.test(s)&&/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(s)){
    if(pendingName&&lastItem===null&&option.items.length===0&&/[.]$/.test(pendingName))pendingName='';
    pendingName=s;
   }
  }
 }
 var ORDER=['Desayuno','Media mañana','Almuerzo','Comida','Merienda','Pre-entreno','Post-entreno','Cena','Recena','Snack'];
 out.forEach(g=>{g.options=g.options.filter(o=>o.items.length)});
 var parsed=out.filter(g=>g.options.length).sort((a,b)=>ORDER.indexOf(a.name)-ORDER.indexOf(b.name));
 for(var gg of parsed)for(var o of gg.options){
  var alts=o.items.filter(i=>i.alternativesText).map(i=>i.name+' → '+i.alternativesText.replace(/\s+/g,' ').trim());
  if(alts.length)o.notes=(o.notes?o.notes+' ':'')+'Alternativas: '+alts.join(' · ');
  delete o._pendingAlt;
 }
 parsed.pdfTarget=target;
 parsed.readReport={groups:parsed.length,options:parsed.reduce((n,g)=>n+g.options.length,0),ingredients:parsed.reduce((n,g)=>n+g.options.reduce((t,o)=>t+o.items.length,0),0)};
 return parsed;
}
export { npTableParse };
