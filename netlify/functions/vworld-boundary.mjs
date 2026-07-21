import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({ statusCode, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}, body:JSON.stringify(body) });
const normalize = value => String(value || '').replace(/\s+/g,'').replace(/산(?=\d)/,'산');
const parsePayload = text => {
  const clean=String(text||'').trim();
  try { return JSON.parse(clean); } catch {}
  const start=clean.indexOf('('), end=clean.lastIndexOf(')');
  if(start>0 && end>start) return JSON.parse(clean.slice(start+1,end));
  throw new Error(`VWorld 응답 형식 오류: ${clean.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,120)}`);
};
const fetchVworld = async url => {
  let lastError;
  for (let attempt=0; attempt<3; attempt+=1) {
    try {
      const response=await fetch(url,{headers:{accept:'application/json,text/javascript,*/*;q=0.8','user-agent':'Mozilla/5.0 (compatible; FarmlandBoundarySync/1.0)','accept-language':'ko-KR,ko;q=0.9'}});
      const text=await response.text();
      if(response.ok && text && !/^\s*<html/i.test(text)) return text;
      lastError=new Error(`VWorld HTTP ${response.status}: ${text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,100)}`);
    } catch(error) { lastError=error; }
    await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
  }
  throw lastError || new Error('VWorld 연결 실패');
};

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405,{error:'POST 요청만 허용됩니다.'});
  const token = String(event.headers.authorization || '').replace(/^Bearer\s+/i,'');
  if (!token) return json(401,{error:'로그인이 필요합니다.'});
  const key=process.env.VWORLD_API_KEY, url=process.env.SUPABASE_URL, anon=process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key || !url || !anon) return json(500,{error:'서버 환경변수가 누락되었습니다.'});
  const supabase=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await supabase.auth.getUser(token);
  if (userError || !user) return json(401,{error:'로그인이 만료되었습니다.'});
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
  if (profile?.role !== 'admin') return json(403,{error:'관리자만 경계를 동기화할 수 있습니다.'});
  let body={}; try{body=JSON.parse(event.body||'{}');}catch{return json(400,{error:'요청 형식이 올바르지 않습니다.'});}
  const {data:farm,error:farmError}=await supabase.from('farmlands').select('id,ri,jibun,full_address').eq('id',body.farmlandId).single();
  if (farmError || !farm) return json(404,{error:'필지를 찾을 수 없습니다.'});
  try {
    const aq=new URLSearchParams({service:'address',request:'getcoord',version:'2.0',crs:'epsg:4326',address:farm.full_address,refine:'true',simple:'false',format:'json',type:'parcel',key});
    const ad=parsePayload(await fetchVworld(`https://api.vworld.kr/req/address?${aq}`));
    const point=ad?.response?.result?.point; if(!point) throw new Error('주소 좌표를 찾지 못했습니다.');
    const x=Number(point.x),y=Number(point.y),d=0.002;
    let wd=null, lastError=null;
    for (const output of ['application/json','text/javascript']) {
      const wq=new URLSearchParams({key,SERVICE:'WFS',version:'1.1.0',request:'GetFeature',TYPENAME:'lt_c_landinfobasemap',BBOX:`${x-d},${y-d},${x+d},${y+d}`,OUTPUT:output,SRSNAME:'EPSG:4326',domain:'wormmanager.netlify.app'});
      try { wd=parsePayload(await fetchVworld(`https://api.vworld.kr/req/wfs?${wq}`)); if(Array.isArray(wd?.features)) break; }
      catch(error){lastError=error;}
    }
    if(!wd) throw lastError || new Error('VWorld WFS 응답이 없습니다.');
    const wanted=normalize(`${farm.ri}${farm.jibun}`);
    const features=Array.isArray(wd?.features)?wd.features:[];
    const feature=features.find(f=>normalize(`${f.properties?.ri_nm||f.properties?.ri||''}${f.properties?.jibun||''}`)===wanted)
      || features.find(f=>normalize(f.properties?.jibun)===normalize(farm.jibun));
    if(!feature?.geometry) throw new Error('주소와 일치하는 필지 경계를 찾지 못했습니다.');
    const {data:stored,error:storeError}=await supabase.rpc('apply_vworld_result_for_admin',{p_farmland_id:farm.id,p_pnu:String(feature.properties?.pnu||''),p_geometry:feature.geometry,p_properties:feature.properties||{}});
    if(storeError) throw storeError;
    return json(200,{ok:true,farmlandId:farm.id,pnu:feature.properties?.pnu||null,geometry:feature.geometry,result:stored});
  } catch(error) { return json(422,{error:error.message||'경계 조회에 실패했습니다.'}); }
}
