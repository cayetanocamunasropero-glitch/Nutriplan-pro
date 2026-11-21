// ATLAS NUTRI: product info proxy. No credentials and no user food diary ever sent to Open Food Facts.
const AGENT='AtlasNutri/2.0 (https://atlas-nutri.vercel.app; product lookup)';
const fields='code,product_name_es,product_name,brands,stores,nutriments,serving_size,quantity,nutrition_data_per';
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
 if(req.method!=='GET')return res.status(405).json({error:'Solo consultas GET'});
 const q=typeof req.query.q==='string'?req.query.q.trim():'';
 const code=typeof req.query.barcode==='string'?req.query.barcode.trim():'';
 if(!q&&!code)return res.status(400).json({error:'Escribe un alimento o un código'});
 if((q&&(!/^[\p{L}\p{N}\s.,()+\-/%]{2,60}$/u.test(q)))||(code&&!/^\d{8,14}$/.test(code)))return res.status(400).json({error:'Búsqueda no válida'});
 const url=code?'https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'?fields='+fields:'https://world.openfoodfacts.org/cgi/search.pl?'+new URLSearchParams({search_terms:q,search_simple:'1',action:'process',json:'1',page_size:'20',fields});
 const timeout=AbortSignal.timeout(9500);
 try{const upstream=await fetch(url,{headers:{'User-Agent':AGENT,'Accept':'application/json'},signal:timeout});if(!upstream.ok){return res.status(upstream.status===429?429:502).json({error:upstream.status===429?'El catálogo está ocupado. Prueba de nuevo más tarde.':'El catálogo no responde. Prueba de nuevo.'})}const data=await upstream.json();
 if(code)return res.status(200).json({product:data.status===1?data.product:null,source:'Open Food Facts'});
 return res.status(200).json({products:Array.isArray(data.products)?data.products:[],count:data.count||0,source:'Open Food Facts'});
 }catch(e){return res.status(502).json({error:'No se pudo consultar el catálogo externo. Vuelve a intentarlo o añade manualmente.'})}
};
