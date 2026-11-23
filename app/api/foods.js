// NutriPlan: buscador de productos (Open Food Facts). Nunca se envían credenciales ni el diario del usuario.
// Texto: buscador nuevo de OFF (search.openfoodfacts.org), con productos de España primero. El antiguo
// /cgi/search.pl bloquea las peticiones desde los servidores de Vercel, así que solo queda de respaldo.
// Código de barras: API v2 de producto.
const AGENT='NutriPlan/2.0 (nutriplan-asesoria.vercel.app; product lookup)';
const fields='code,product_name_es,product_name,brands,stores,nutriments,serving_size,quantity,nutrition_data_per,nutriscore_grade';
const get=(url,ms)=>fetch(url,{headers:{'User-Agent':AGENT,'Accept':'application/json'},signal:AbortSignal.timeout(ms)});
// El buscador nuevo devuelve las marcas como lista; la app espera texto como en la API clásica
const norm=(h)=>({...h,brands:Array.isArray(h.brands)?h.brands.join(', '):h.brands});
async function searchNew(q,spain){
 const terms=q.replace(/[()+\-\/:"]/g,' ').replace(/\s+/g,' ').trim();
 const u='https://search.openfoodfacts.org/search?'+new URLSearchParams({q:spain?terms+' countries_tags:"en:spain"':terms,langs:'es',page_size:'20',fields});
 const r=await get(u,6000);if(!r.ok)throw new Error('search '+r.status);
 const d=await r.json();return Array.isArray(d.hits)?d.hits.map(norm):[];
}
async function searchOld(q){
 const u='https://world.openfoodfacts.org/cgi/search.pl?'+new URLSearchParams({search_terms:q,search_simple:'1',action:'process',json:'1',page_size:'20',fields});
 const r=await get(u,5000);if(!r.ok)throw new Error('search.pl '+r.status);
 const d=await r.json();return Array.isArray(d.products)?d.products:[];
}
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
 if(req.method!=='GET')return res.status(405).json({error:'Solo consultas GET'});
 const q=typeof req.query.q==='string'?req.query.q.trim():'';
 const code=typeof req.query.barcode==='string'?req.query.barcode.trim():'';
 if(!q&&!code)return res.status(400).json({error:'Escribe un alimento o un código'});
 if((q&&(!/^[\p{L}\p{N}\s.,()+\-/%]{2,60}$/u.test(q)))||(code&&!/^\d{8,14}$/.test(code)))return res.status(400).json({error:'Búsqueda no válida'});
 try{
  if(code){
   const r=await get('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'?fields='+fields,9000);
   if(!r.ok&&r.status!==404)return res.status(r.status===429?429:502).json({error:r.status===429?'El catálogo está ocupado. Prueba de nuevo más tarde.':'El catálogo no responde. Prueba de nuevo.'});
   const data=await r.json();return res.status(200).json({product:data.status===1?data.product:null,source:'Open Food Facts'});
  }
  let products=[];
  try{products=await searchNew(q,true);if(!products.length)products=await searchNew(q,false)}
  catch(e){products=await searchOld(q)}
  return res.status(200).json({products,count:products.length,source:'Open Food Facts'});
 }catch(e){return res.status(502).json({error:'No se pudo consultar el catálogo externo. Vuelve a intentarlo o añade manualmente.'})}
};
