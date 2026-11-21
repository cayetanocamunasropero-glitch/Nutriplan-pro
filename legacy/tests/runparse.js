const pdfjs=require('/home/claude/pdfjs/package/legacy/build/pdf.js');
const {npTableParse}=require('/home/claude/work/diario/pdftable.js');
const fs=require('fs');
(async()=>{
 for(const f of process.argv.slice(2)){
  const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(f)),verbosity:0}).promise;
  const pages=[];for(let i=1;i<=pdf.numPages;i++){const tc=await (await pdf.getPage(i)).getTextContent();pages.push(tc.items.map(it=>({str:it.str,x:it.transform[4],y:it.transform[5]})))}
  const r=npTableParse(pages);
  const n=f.split('/').pop();
  console.log('##',n.slice(0,58),JSON.stringify(r.readReport),'target',JSON.stringify(r.pdfTarget));
  if(process.env.DUMP&&n.includes(process.env.DUMP))for(const g of r){console.log(' ',g.name);for(const o of g.options){const k=o.items.reduce((a,i)=>a+i.kcal*i.grams/100,0);console.log('   ',o.letter,o.title,'| pdf',o.pdfKcal,'calc',Math.round(k));for(const i of o.items)console.log('      -',i.name,i.grams+i.unit,'| /100:',i.kcal,i.c,i.p,i.f,i.alternativesText?'| ALT: '+i.alternativesText:'',i.portion?'| '+i.portion:'');if(o.notes)console.log('      notes:',o.notes.slice(0,160))}}
 }
})();
