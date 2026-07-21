import { createClient } from "@supabase/supabase-js";

const config = window.FARMLAND_APP_CONFIG || {};
const status = document.createElement("div");
status.id = "serverSyncStatus";
status.style.cssText = "position:fixed;right:10px;top:10px;z-index:10000;padding:7px 11px;border-radius:999px;background:#fff;color:#334155;box-shadow:0 2px 12px #0002;font:800 12px system-ui";
status.textContent = "서버 연결 중";
document.body.append(status);

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  status.textContent = "서버 설정 없음";
  status.style.color = "#b91c1c";
  throw new Error("Supabase 배포 환경변수가 없습니다.");
}

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let orgId = null;
let applyingRemote = false;
let saveTimer = null;
let lastRemoteTimestamp = "";
let connecting = false;
let connected = false;
let boundarySyncRunning = false;

const normalizeAddress = value => String(value || "").replace(/\s+/g, "");

function mergeBoundarySnapshot(snapshot) {
  const state = window.farmlandAppBridge?.getState();
  if (!state?.parcels || !Array.isArray(snapshot?.farmlands)) return { state, missing: [] };
  const missing = [];
  let changed = false;
  for (const farm of snapshot.farmlands) {
    const full = normalizeAddress(farm.fullAddress);
    const parcel = state.parcels.find(item => {
      const address = normalizeAddress(item.address);
      return address && (full.endsWith(address) || address.endsWith(normalizeAddress(`${farm.ri || ""}${farm.jibun || ""}`)));
    });
    if (!parcel) continue;
    if (farm.geometry && JSON.stringify(parcel.geometry) !== JSON.stringify(farm.geometry)) {
      parcel.geometry = farm.geometry;
      changed = true;
    }
    if (!farm.geometry) missing.push(farm.id);
  }
  if (changed) window.farmlandAppBridge?.applyRemoteState(state);
  return { state, missing };
}

async function syncBoundaries() {
  if (boundarySyncRunning) return;
  boundarySyncRunning = true;
  try {
    const { data: snapshot, error } = await supabase.rpc("app_snapshot");
    if (error) throw error;
    let { missing } = mergeBoundarySnapshot(snapshot);
    if (!missing.length) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    for (let index = 0; index < missing.length; index += 1) {
      setStatus(`필지 경계 확인 ${index + 1}/${missing.length}`);
      const response = await fetch("/.netlify/functions/vworld-boundary", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ farmlandId: missing[index] })
      });
      if (response.ok) {
        const result = await response.json();
        const state = window.farmlandAppBridge?.getState();
        const farm = snapshot.farmlands.find(item => item.id === result.farmlandId);
        const full = normalizeAddress(farm?.fullAddress);
        const parcel = state?.parcels?.find(item => full.endsWith(normalizeAddress(item.address)));
        if (parcel) { parcel.geometry = result.geometry; window.farmlandAppBridge?.applyRemoteState(state); }
      }
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    await saveRemoteState("필지 경계 동기화");
  } catch (error) {
    console.error("Boundary sync failed", error);
    setStatus("일부 필지 경계 확인 필요", true);
  } finally {
    boundarySyncRunning = false;
  }
}

function setStatus(text, error = false) {
  status.textContent = text;
  status.style.color = error ? "#b91c1c" : "#166534";
}

function authOverlay(message = "서버에 저장하려면 로그인하세요.") {
  let overlay = document.getElementById("farmlandAuthOverlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "farmlandAuthOverlay";
  overlay.style.cssText = "position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#0f172acc;padding:20px";
  overlay.innerHTML = `<form style="width:min(390px,100%);background:#fff;border-radius:20px;padding:24px;box-shadow:0 20px 60px #0005;font-family:system-ui">
    <h2 style="margin:0 0 8px">실시간 농지관리 로그인</h2>
    <p data-message style="margin:0 0 16px;color:#64748b">${message}</p>
    <label style="display:block;margin-bottom:10px">이메일<input name="email" type="email" required autocomplete="username" style="box-sizing:border-box;width:100%;margin-top:5px;padding:12px;border:1px solid #cbd5e1;border-radius:10px"></label>
    <label style="display:block;margin-bottom:14px">비밀번호<input name="password" type="password" required autocomplete="current-password" style="box-sizing:border-box;width:100%;margin-top:5px;padding:12px;border:1px solid #cbd5e1;border-radius:10px"></label>
    <button style="width:100%;padding:13px;border:0;border-radius:11px;background:#166534;color:#fff;font-weight:900">로그인</button>
  </form>`;
  overlay.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const messageEl = overlay.querySelector("[data-message]");
    messageEl.textContent = "로그인 중…";
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || "")
    });
    if (error) messageEl.textContent = `로그인 오류: ${error.message}`;
  });
  document.body.append(overlay);
  return overlay;
}

async function profileOrg() {
  const { data, error } = await supabase.from("profiles").select("org_id").single();
  if (error) throw error;
  return data.org_id;
}

async function loadRemoteState() {
  const { data, error } = await supabase.from("app_states").select("state,updated_at").eq("org_id", orgId).maybeSingle();
  if (error) throw error;
  if (data?.state?.parcels) {
    lastRemoteTimestamp = data.updated_at || "";
    applyingRemote = true;
    window.farmlandAppBridge?.applyRemoteState(data.state);
    applyingRemote = false;
    return;
  }
  await saveRemoteState("서버 최초 저장");
}

async function saveRemoteState(reason = "자동 저장") {
  if (!orgId || applyingRemote) return;
  const state = window.farmlandAppBridge?.getState();
  if (!state?.parcels) return;
  setStatus("저장 중…");
  const { data, error } = await supabase.from("app_states").upsert({ org_id: orgId, state, updated_at: new Date().toISOString() }, { onConflict: "org_id" }).select("updated_at").single();
  if (error) {
    setStatus("서버 저장 오류", true);
    console.error("Supabase state save failed", reason, error);
    return;
  }
  lastRemoteTimestamp = data.updated_at;
  setStatus("실시간 저장됨");
}

window.farmlandServerSave = reason => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveRemoteState(reason), 350);
};

async function connect() {
  if (connecting || connected) return;
  connecting = true;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    connecting = false;
    setStatus("로그인 필요", true);
    authOverlay();
    return;
  }
  document.getElementById("farmlandAuthOverlay")?.remove();
  try {
    orgId = await profileOrg();
    await loadRemoteState();
    setTimeout(syncBoundaries, 800);
    supabase.channel(`app-state-${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_states", filter: `org_id=eq.${orgId}` }, payload => {
        const row = payload.new;
        if (!row?.state?.parcels || row.updated_at === lastRemoteTimestamp) return;
        lastRemoteTimestamp = row.updated_at || "";
        applyingRemote = true;
        window.farmlandAppBridge?.applyRemoteState(row.state);
        applyingRemote = false;
        setStatus("실시간 동기화됨");
      })
      .subscribe(state => {
        if (state === "SUBSCRIBED") {
          connected = true;
          connecting = false;
          setStatus("실시간 연결됨");
        } else {
          setStatus("서버 연결 중");
        }
      });
  } catch (error) {
    connecting = false;
    setStatus("서버 연결 오류", true);
    console.error(error);
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session && !orgId) setTimeout(connect, 0);
});

connect();
