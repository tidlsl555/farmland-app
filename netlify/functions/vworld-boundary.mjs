import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({ statusCode, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}, body:JSON.stringify(body) });
const normalize = value => String(value || '').replace(/\s+/g,'').replace(/산(?=\d)/,'산');

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
    const ar=await fetch(`https://api.vworld.kr/req/address?${aq}`); const ad=await ar.json();
    const point=ad?.response?.result?.point; if(!point) throw new Error('주소 좌표를 찾지 못했습니다.');
    const x=Number(point.x),y=Number(point.y),d=0.002;
    const wq=new URLSearchParams({service:'WFS',request:'GetFeature',version:'2.0.0',typename:'lt_c_landinfobasemap',bbox:`${x-d},${y-d},${x+d},${y+d},EPSG:4326`,output:'application/json',srsname:'EPSG:4326',key,domain:'wormmanager.netlify.app'});
    const wr=await fetch(`https://api.vworld.kr/req/wfs?${wq}`); const wd=await wr.json();
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
