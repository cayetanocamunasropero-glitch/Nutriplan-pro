/* Rebuild the four Brotli modules served by the ORIGINAL api/index.js.
   No deployment or database writes. Node.js built-in modules only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../04_NutriPlan/Codigo_actual');
const input=path.resolve(process.argv[2]||path.join(root,'APP_EDITABLE.html'));
const output=path.resolve(process.argv[3]||path.join(root,'chunks'));
const html=fs.readFileSync(input);
const compressed=zlib.brotliCompressSync(html,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
fs.mkdirSync(output,{recursive:true});
const size=Math.ceil(compressed.length/4),parts=[];
for(let i=0;i<4;i++){
 const part=compressed.slice(i*size,(i+1)*size);parts.push(part);
 fs.writeFileSync(path.join(output,`chunk${i}.js`),'module.exports='+JSON.stringify(part)+';\n');
}
const roundtrip=zlib.brotliDecompressSync(Buffer.from(parts.join(''),'base64'));
if(!roundtrip.equals(html))throw new Error('No coincide el HTML después de reconstruir');
console.log(JSON.stringify({input,output,htmlBytes:html.length,modules:4,roundtrip:true}));
