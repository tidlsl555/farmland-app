import { createClient } from "@supabase/supabase-js";
import "./styles.css";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import Draw from "ol/interaction/Draw.js";
import Style from "ol/style/Style.js";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import Text from "ol/style/Text.js";
import CircleStyle from "ol/style/Circle.js";
import { fromLonLat } from "ol/proj.js";
import { createEmpty, extend as extendExtent, isEmpty as isEmptyExtent } from "ol/extent.js";

const $ = (id) => document.getElementById(id);
const configDialog = $("configDialog");
const authDialog = $("authDialog");
const busy = $("busy");
const toastElement = $("toast");
const geojson = new GeoJSON();

let client = null;
let map = null;
let parcelSource = null;
let parcelLayer = null;
let scratchSource = null;
let scratchLayer = null;
let drawInteraction = null;
let realtimeChannel = null;
let reloadTimer = null;
let syncStopRequested = false;
let toastTimer = null;

const state = {
  snapshot: {
    profile: null,
    farmlands: [],
    jobs: [],
    activeWork: [],
    recentWork: [],
    waterSessions: [],
  },
  selectedJobId: null,
  selectedFarmId: null,
  quickMode: true,
  loading: false,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showBusy(show, text = "처리 중") {
  busy.classList.toggle("hidden", !show);
  busy.querySelector("b").textContent = text;
}

function toast(message, duration = 2600) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.remove("hidden");
  toastTimer = setTimeout(() => toastElement.classList.add("hidden"), duration);
}

function parseConfig() {
  const bundled = window.FARMLAND_APP_CONFIG ?? {};
  let local = {};
  try {
    local = JSON.parse(localStorage.getItem("farmland_web_config") ?? "{}");
  } catch {
    local = {};
  }
  return {
    supabaseUrl: String(local.supabaseUrl || bundled.supabaseUrl || "").trim(),
    supabaseAnonKey: String(local.supabaseAnonKey || bundled.supabaseAnonKey || "").trim(),
  };
}

function isValidConfig(config) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl)
    && config.supabaseAnonKey.length > 30;
}

function configureFirstRun() {
  const config = parseConfig();
  if (isValidConfig(config)) return config;

  $("configUrl").value = config.supabaseUrl;
  $("configKey").value = config.supabaseAnonKey;
  configDialog.showModal();
  return null;
}

$("configForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const supabaseUrl = $("configUrl").value.trim().replace(/\/$/, "");
  const supabaseAnonKey = $("configKey").value.trim();
  if (!isValidConfig({ supabaseUrl, supabaseAnonKey })) {
    toast("Supabase URL 또는 키 형식을 확인하세요.");
    return;
  }
  localStorage.setItem("farmland_web_config", JSON.stringify({ supabaseUrl, supabaseAnonKey }));
  location.reload();
});

function updateNetworkBadge() {
  const online = navigator.onLine;
  const badge = $("onlineBadge");
  badge.textContent = online ? "온라인" : "오프라인 · 저장 중지";
  badge.classList.toggle("online", online);
  badge.classList.toggle("offline", !online);
}
window.addEventListener("online", () => {
  updateNetworkBadge();
  reloadSnapshot();
});
window.addEventListener("offline", updateNetworkBadge);

function requireOnline() {
  if (navigator.onLine) return true;
  toast("인터넷 연결 후 다시 시도하세요.");
  return false;
}

async function ensureSession() {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    authDialog.showModal();
    return false;
  }
  return true;
}

$("passwordLoginBtn").addEventListener("click", async () => {
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const message = $("authMessage");
  if (!email || !password) {
    message.textContent = "이메일과 비밀번호를 입력하세요.";
    return;
  }
  message.textContent = "로그인 중...";
  const { error } = await client.auth.signInWithPassword({ email, password });
  message.textContent = error ? error.message : "로그인되었습니다.";
  if (!error) {
    authDialog.close();
    await afterLogin();
  }
});

$("magicLinkBtn").addEventListener("click", async () => {
  const email = $("authEmail").value.trim();
  const message = $("authMessage");
  if (!email) {
    message.textContent = "이메일을 입력하세요.";
    return;
  }
  message.textContent = "로그인 링크 전송 중...";
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  message.textContent = error ? error.message : "이메일에서 로그인 링크를 누르세요.";
});

$("signOutBtn").addEventListener("click", async () => {
  await client.auth.signOut();
  location.reload();
});

function initMap() {
  parcelSource = new VectorSource();
  scratchSource = new VectorSource();

  parcelLayer = new VectorLayer({
    source: parcelSource,
    declutter: true,
    style: styleForFeature,
  });
  scratchLayer = new VectorLayer({
    source: scratchSource,
    style: new Style({
      fill: new Fill({ color: "rgba(14,165,233,.20)" }),
      stroke: new Stroke({ color: "#0284c7", width: 3 }),
    }),
  });

  map = new Map({
    target: "map",
    layers: [
      new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }) }),
      parcelLayer,
      scratchLayer,
    ],
    view: new View({
      center: fromLonLat([128.25, 36.62]),
      zoom: 12,
      minZoom: 6,
      maxZoom: 20,
    }),
  });

  map.on("singleclick", (event) => {
    if (drawInteraction) return;
    const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
      hitTolerance: 8,
      layerFilter: (layer) => layer === parcelLayer,
    });
    if (!feature) return;
    const farmId = feature.get("farmId");
    if (farmId) onFarmSelected(farmId, true);
  });
}

function hexToRgba(hex, alpha) {
  const value = String(hex ?? "#475569").replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value.padEnd(6, "0").slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}

function activeWorkMap() {
  const map = new Map();
  for (const item of state.snapshot.activeWork) {
    map.set(`${item.farmlandId}:${item.jobId}`, item);
  }
  return map;
}

function styleForFeature(feature) {
  const farmId = feature.get("farmId");
  const farm = state.snapshot.farmlands.find((item) => item.id === farmId);
  if (!farm) return null;

  const job = selectedJob();
  const completed = job && activeWorkMap().has(`${farmId}:${job.id}`);
  const selected = state.selectedFarmId === farmId;
  const isPoint = feature.getGeometry()?.getType() === "Point";
  const exact = ["exact", "gps_verified", "manual_verified"].includes(farm.locationStatus);
  const color = job?.color ?? "#166534";

  const strokeColor = selected ? "#0f172a" : exact ? "#166534" : "#f97316";
  const strokeWidth = selected ? 4 : exact ? 2.5 : 2;
  const fillColor = completed ? hexToRgba(color, .52) : exact
    ? "rgba(34,197,94,.13)"
    : "rgba(249,115,22,.16)";

  const text = new Text({
    text: farm.displayCode,
    font: "700 13px system-ui",
    fill: new Fill({ color: "#0f172a" }),
    stroke: new Stroke({ color: "#ffffff", width: 4 }),
    overflow: true,
  });

  if (isPoint) {
    return new Style({
      image: new CircleStyle({
        radius: selected ? 11 : 9,
        fill: new Fill({ color: completed ? color : "#fff7ed" }),
        stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
      }),
      text,
    });
  }

  return new Style({
    fill: new Fill({ color: fillColor }),
    stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
    text,
  });
}

function rebuildMapFeatures() {
  if (!parcelSource) return;
  parcelSource.clear();
  for (const farm of state.snapshot.farmlands) {
    try {
      if (farm.geometry) {
        const feature = geojson.readFeature({
          type: "Feature",
          geometry: farm.geometry,
          properties: { farmId: farm.id },
        }, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });
        feature.set("farmId", farm.id);
        parcelSource.addFeature(feature);
      } else if (farm.gpsPoint) {
        const feature = geojson.readFeature({
          type: "Feature",
          geometry: farm.gpsPoint,
          properties: { farmId: farm.id },
        }, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        });
        feature.set("farmId", farm.id);
        parcelSource.addFeature(feature);
      }
    } catch (error) {
      console.error("Geometry error", farm.displayCode, error);
    }
  }
  parcelLayer.changed();
}

function selectedJob() {
  return state.snapshot.jobs.find((job) => job.id === state.selectedJobId) ?? null;
}
function selectedFarm() {
  return state.snapshot.farmlands.find((farm) => farm.id === state.selectedFarmId) ?? null;
}
function openWaterSession(farmId) {
  return state.snapshot.waterSessions.find((session) =>
    session.farmlandId === farmId && !session.finishedAt && !session.cancelledAt
  ) ?? null;
}

function renderMetrics() {
  const farms = state.snapshot.farmlands;
  const jobs = state.snapshot.jobs;
  const job = selectedJob();
  const exactCount = farms.filter((farm) =>
    farm.geometry && ["exact", "gps_verified", "manual_verified"].includes(farm.locationStatus)
  ).length;
  const completeCount = job
    ? state.snapshot.activeWork.filter((item) => item.jobId === job.id).length
    : 0;

  $("farmCount").textContent = String(farms.length);
  $("boundaryCount").textContent = `${exactCount}/${farms.length}`;
  $("workMetricLabel").textContent = job?.name ?? "작업";
  $("workCount").textContent = `${completeCount}/${farms.length}`;
}

function renderJobs() {
  const select = $("jobSelect");
  const previous = state.selectedJobId;
  select.innerHTML = state.snapshot.jobs
    .map((job) => `<option value="${job.id}">${escapeHtml(job.name)}</option>`)
    .join("");

  if (!state.snapshot.jobs.some((job) => job.id === previous)) {
    state.selectedJobId = state.snapshot.jobs[0]?.id ?? null;
  }
  select.value = state.selectedJobId ?? "";
}

function latestUndoableEvent() {
  const activeIds = new Set(state.snapshot.activeWork.map((item) => item.eventId));
  return state.snapshot.recentWork
    .filter((item) => item.action === "complete" && activeIds.has(item.id))
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0] ?? null;
}

function renderUndo() {
  const event = latestUndoableEvent();
  const button = $("undoBtn");
  if (!event) {
    button.disabled = true;
    button.textContent = "취소할 작업 없음";
    button.dataset.eventId = "";
    return;
  }
  button.disabled = false;
  button.dataset.eventId = event.id;
  button.textContent = `${event.displayCode} ${event.jobName} 취소`;
}

function statusLabel(farm) {
  const labels = {
    exact: "브이월드 경계",
    gps_verified: "경계+GPS 확인",
    manual_verified: "직접 그린 경계",
    gps_only: "GPS 점만 등록",
    lookup_failed: "자동조회 실패",
    candidate: "검증 필요",
    missing: "미등록",
  };
  return labels[farm.locationStatus] ?? farm.locationStatus;
}

function renderFarmList() {
  const query = $("farmSearch").value.trim().toLowerCase();
  const items = state.snapshot.farmlands.filter((farm) => {
    const text = [
      farm.displayCode, farm.placeName, farm.ownerName, farm.ri, farm.jibun, farm.fullAddress,
    ].join(" ").toLowerCase();
    return !query || text.includes(query);
  });
  $("farmList").innerHTML = items.map((farm) => `
    <div class="list-item" data-farm-id="${farm.id}">
      <div class="list-main">
        <b>${escapeHtml(farm.displayCode)} · ${escapeHtml(farm.placeName || farm.ri)}</b>
        <span>${escapeHtml(farm.ri)} ${escapeHtml(farm.jibun)} · ${escapeHtml(farm.ownerName || "지주 미입력")}</span>
        <small>${farm.areaSqm ? Number(farm.areaSqm).toLocaleString() + "㎡" : "면적 미입력"} · ${escapeHtml(farm.variety || "품종 미입력")}</small>
        <small class="location-chip ${farm.geometry ? "exact" : farm.locationStatus === "lookup_failed" ? "failed" : ""}">${escapeHtml(statusLabel(farm))}</small>
      </div>
    </div>
  `).join("") || `<div class="panel-card">검색 결과가 없습니다.</div>`;
}

function renderLocationList() {
  const farms = state.snapshot.farmlands.filter((farm) =>
    !farm.geometry || !["exact", "gps_verified", "manual_verified"].includes(farm.locationStatus)
  );
  const isAdmin = state.snapshot.profile?.role === "admin";
  $("locationList").innerHTML = farms.map((farm) => `
    <div class="list-item">
      <div class="list-main" data-focus-farm="${farm.id}">
        <b>${escapeHtml(farm.displayCode)} · ${escapeHtml(farm.placeName || farm.ri)}</b>
        <span>${escapeHtml(farm.fullAddress)}</span>
        <small class="location-chip ${farm.locationStatus === "lookup_failed" ? "failed" : ""}">${escapeHtml(statusLabel(farm))}</small>
        ${farm.lookupError ? `<small>${escapeHtml(farm.lookupError)}</small>` : ""}
      </div>
      <div class="list-actions">
        ${isAdmin ? `<button data-sync-farm="${farm.id}">경계조회</button>` : ""}
        <button data-gps-farm="${farm.id}">현장 GPS</button>
        ${isAdmin ? `<button data-draw-farm="${farm.id}">경계그리기</button>` : ""}
      </div>
    </div>
  `).join("") || `<div class="panel-card">모든 농지의 경계가 등록되었습니다.</div>`;
  $("syncAllBtn").disabled = !isAdmin || farms.length === 0;
}

function renderSelectedFarm() {
  const farm = selectedFarm();
  const card = $("selectedFarmCard");
  card.classList.toggle("hidden", !farm);
  if (!farm) return;
  $("selectedFarmTitle").textContent = `${farm.displayCode} · ${farm.placeName || farm.ri}`;
  $("selectedFarmAddress").textContent = `${farm.fullAddress} · ${statusLabel(farm)}`;
}

function formatElapsed(startedAt) {
  const ms = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days ? days + "일 " : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function renderWaterPanel() {
  const job = selectedJob();
  const panel = $("waterPanel");
  panel.classList.toggle("hidden", !job?.isWater);
  if (!job?.isWater) return;

  const farm = selectedFarm();
  const session = farm ? openWaterSession(farm.id) : null;
  $("waterFarmLabel").textContent = farm
    ? `${farm.displayCode} · ${farm.placeName || farm.ri}`
    : "지도에서 농지를 선택하세요";

  $("waterStartBtn").classList.toggle("hidden", !farm || Boolean(session));
  $("waterFinishBtn").classList.toggle("hidden", !session);
  $("waterCancelBtn").classList.toggle("hidden", !session);

  if (!session) {
    $("waterTimer").textContent = farm ? "대기" : "--:--";
    $("waterProgressBar").style.width = "0%";
    return;
  }

  const elapsedHours = Math.max(0, (Date.now() - new Date(session.startedAt).getTime()) / 3600000);
  $("waterTimer").textContent = formatElapsed(session.startedAt);
  $("waterProgressBar").style.width = `${Math.min(100, elapsedHours / 72 * 100)}%`;
  $("waterProgressBar").style.background = elapsedHours >= 72 ? "#dc2626" : elapsedHours >= 48 ? "#f59e0b" : "#0284c7";
}

function renderHistory() {
  const list = state.snapshot.recentWork;
  $("historyList").innerHTML = list.map((event) => {
    const completion = event.action === "complete";
    const cancelled = completion && event.isCancelled;
    return `
      <div class="history-item ${cancelled ? "cancelled" : ""}">
        <div class="content">
          <b>${escapeHtml(event.displayCode)} · ${escapeHtml(event.jobName)} · ${event.action === "cancel" ? "취소 기록" : cancelled ? "취소됨" : "완료"}</b>
          <small>${new Date(event.occurredAt).toLocaleString("ko-KR")}${event.note ? " · " + escapeHtml(event.note) : ""}</small>
        </div>
        ${completion && !cancelled ? `<button class="danger" data-cancel-event="${event.id}">취소</button>` : ""}
        ${completion && cancelled ? `<button class="secondary" data-restore-event="${event.id}">복원</button>` : ""}
      </div>
    `;
  }).join("") || "<p>작업 기록이 없습니다.</p>";
}

function renderProfile() {
  const profile = state.snapshot.profile;
  $("profileInfo").innerHTML = profile
    ? `<b>${escapeHtml(profile.displayName || "사용자")}</b><br>권한: ${escapeHtml(profile.role)}`
    : "프로필 연결이 필요합니다.";
}

function renderAll() {
  renderJobs();
  renderMetrics();
  renderUndo();
  renderFarmList();
  renderLocationList();
  renderSelectedFarm();
  renderWaterPanel();
  renderHistory();
  renderProfile();
  rebuildMapFeatures();
}

async function reloadSnapshot(showIndicator = false) {
  if (!client || state.loading) return;
  state.loading = true;
  if (showIndicator) showBusy(true, "서버 데이터 불러오는 중");
  try {
    const { data, error } = await client.rpc("app_snapshot");
    if (error) throw error;
    if (!data?.profile) {
      throw new Error("로그인 계정이 profiles 테이블에 등록되지 않았습니다. 관리자 초기설정을 확인하세요.");
    }
    state.snapshot = data;
    if (!state.selectedJobId || !data.jobs.some((job) => job.id === state.selectedJobId)) {
      state.selectedJobId = data.jobs[0]?.id ?? null;
    }
    if (state.selectedFarmId && !data.farmlands.some((farm) => farm.id === state.selectedFarmId)) {
      state.selectedFarmId = null;
    }
    renderAll();
  } catch (error) {
    console.error(error);
    toast(error.message ?? String(error), 5000);
  } finally {
    state.loading = false;
    if (showIndicator) showBusy(false);
  }
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => reloadSnapshot(), 250);
}

function subscribeRealtime() {
  if (realtimeChannel) client.removeChannel(realtimeChannel);
  realtimeChannel = client.channel("farmland-realtime-v1");
  for (const table of ["farmlands", "jobs", "work_events", "water_sessions", "location_events"]) {
    realtimeChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      scheduleReload,
    );
  }
  realtimeChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") toast("실시간 동기화 연결됨");
  });
}

async function afterLogin() {
  await reloadSnapshot(true);
  subscribeRealtime();
  fitAll();
}

async function rpc(name, args = {}, options = {}) {
  if (!requireOnline()) throw new Error("오프라인입니다.");
  if (options.busy !== false) showBusy(true, options.label ?? "서버에 저장 중");
  try {
    const { data, error } = await client.rpc(name, args);
    if (error) throw error;
    return data;
  } finally {
    if (options.busy !== false) showBusy(false);
  }
}

async function onFarmSelected(farmId, fromMap = false) {
  state.selectedFarmId = farmId;
  renderSelectedFarm();
  renderWaterPanel();
  parcelLayer.changed();

  const job = selectedJob();
  if (!fromMap || !state.quickMode || !job) return;
  if (job.isWater) {
    toast("물관리 상자에서 시작·종료하세요.");
    return;
  }
  const active = state.snapshot.activeWork.some((item) =>
    item.farmlandId === farmId && item.jobId === job.id
  );
  if (active) {
    toast("이미 완료된 작업입니다. 하단 취소 버튼 또는 작업 기록에서 취소할 수 있습니다.");
    return;
  }
  try {
    await rpc("complete_work", {
      p_farmland_id: farmId,
      p_job_id: job.id,
      p_note: null,
    }, { label: `${job.name} 저장 중` });
    navigator.vibrate?.(35);
    await reloadSnapshot();
    toast(`${selectedFarm()?.displayCode ?? ""} ${job.name} 완료`);
  } catch (error) {
    toast(error.message ?? String(error), 4500);
  }
}

function focusFarm(farmId) {
  state.selectedFarmId = farmId;
  const feature = parcelSource.getFeatures().find((item) => item.get("farmId") === farmId);
  if (feature) {
    map.getView().fit(feature.getGeometry().getExtent(), {
      padding: [160, 80, 150, 80],
      maxZoom: 18,
      duration: 450,
    });
  } else {
    toast("지도 경계 또는 GPS 위치가 아직 없습니다.");
  }
  renderSelectedFarm();
  renderWaterPanel();
  parcelLayer.changed();
}

function fitAll() {
  const extent = createEmpty();
  for (const feature of parcelSource?.getFeatures() ?? []) {
    extendExtent(extent, feature.getGeometry().getExtent());
  }
  if (isEmptyExtent(extent)) {
    map.getView().setCenter(fromLonLat([128.25, 36.62]));
    map.getView().setZoom(12);
    return;
  }
  map.getView().fit(extent, {
    padding: [150, 60, 135, 60],
    maxZoom: 16,
    duration: 500,
  });
}

$("jobSelect").addEventListener("change", () => {
  state.selectedJobId = $("jobSelect").value;
  renderMetrics();
  renderUndo();
  renderWaterPanel();
  parcelLayer.changed();
});
$("quickMode").addEventListener("change", () => {
  state.quickMode = $("quickMode").checked;
});
$("undoBtn").addEventListener("click", async () => {
  const eventId = $("undoBtn").dataset.eventId;
  if (!eventId) return;
  try {
    await rpc("cancel_work", { p_completion_event_id: eventId, p_note: "빠른 취소" }, { label: "작업 취소 중" });
    await reloadSnapshot();
    toast("작업 완료 기록을 취소했습니다.");
  } catch (error) {
    toast(error.message ?? String(error), 4500);
  }
});
$("historyBtn").addEventListener("click", () => {
  renderHistory();
  $("historyDialog").showModal();
});
$("historyCloseBtn").addEventListener("click", () => $("historyDialog").close());
$("historyList").addEventListener("click", async (event) => {
  const cancelId = event.target.closest("[data-cancel-event]")?.dataset.cancelEvent;
  const restoreId = event.target.closest("[data-restore-event]")?.dataset.restoreEvent;
  try {
    if (cancelId) {
      await rpc("cancel_work", { p_completion_event_id: cancelId, p_note: "기록 화면에서 취소" });
      await reloadSnapshot();
    } else if (restoreId) {
      await rpc("restore_work", { p_completion_event_id: restoreId, p_note: "취소 기록 복원" });
      await reloadSnapshot();
    }
  } catch (error) {
    toast(error.message ?? String(error), 4500);
  }
});

$("waterStartBtn").addEventListener("click", async () => {
  const farm = selectedFarm();
  if (!farm) return;
  try {
    await rpc("start_water", { p_farmland_id: farm.id, p_note: null }, { label: "물관리 시작 저장 중" });
    await reloadSnapshot();
    toast(`${farm.displayCode} 물관리를 시작했습니다.`);
  } catch (error) {
    toast(error.message ?? String(error), 4500);
  }
});
$("waterFinishBtn").addEventListener("click", async () => {
  const farm = selectedFarm();
  const session = farm ? openWaterSession(farm.id) : null;
  if (!session) return;
  try {
    await rpc("finish_water", { p_session_id: session.id }, { label: "물관리 종료 저장 중" });
    await reloadSnapshot();
    toast("물관리를 종료했습니다.");
  } catch (error) {
    toast(error.message ?? String(error), 4500);
  }
});
$("waterCancelBtn").addEventListener("click", async () => {
  const farm = selectedFarm();
  const session = farm ? openWaterSession(farm.id) : null;
  if (!session || !confirm("이 물관리 기록을 취소 상태로 남기시겠습니까?")) return;
  try {
    await rpc("cancel_water", { p_session_id: session.id }, { label: "물관리 기록 취소 중" });
    await reloadSnapshot();
    toast("물관리 기록을 취소했습니다.");
  } catch (error) {
    toast(error.message ?? String(error), 4500);
  }
});

function openDrawer(tab = "location") {
  $("drawer").classList.add("open");
  $("drawer").setAttribute("aria-hidden", "false");
  $("drawerBackdrop").classList.remove("hidden");
  selectTab(tab);
}
function closeDrawer() {
  $("drawer").classList.remove("open");
  $("drawer").setAttribute("aria-hidden", "true");
  $("drawerBackdrop").classList.add("hidden");
}
function selectTab(tab) {
  document.querySelectorAll(".drawer-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  $("locationTab").classList.toggle("hidden", tab !== "location");
  $("dataTab").classList.toggle("hidden", tab !== "data");
  $("farmsTab").classList.toggle("hidden", tab !== "farms");
}
$("menuBtn").addEventListener("click", () => openDrawer("location"));
$("drawerCloseBtn").addEventListener("click", closeDrawer);
$("drawerBackdrop").addEventListener("click", closeDrawer);
document.querySelectorAll(".drawer-tabs button").forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.tab));
});
$("farmSearch").addEventListener("input", renderFarmList);
$("farmList").addEventListener("click", (event) => {
  const item = event.target.closest("[data-farm-id]");
  if (!item) return;
  closeDrawer();
  focusFarm(item.dataset.farmId);
});
$("locationList").addEventListener("click", async (event) => {
  const syncId = event.target.closest("[data-sync-farm]")?.dataset.syncFarm;
  const gpsId = event.target.closest("[data-gps-farm]")?.dataset.gpsFarm;
  const drawId = event.target.closest("[data-draw-farm]")?.dataset.drawFarm;
  const focusId = event.target.closest("[data-focus-farm]")?.dataset.focusFarm;
  if (syncId) await syncOneFarm(syncId);
  else if (gpsId) await registerGps(gpsId);
  else if (drawId) beginManualDraw(drawId);
  else if (focusId) focusFarm(focusId);
});

async function syncOneFarm(farmId, quiet = false) {
  if (!requireOnline()) return false;
  const farm = state.snapshot.farmlands.find((item) => item.id === farmId);
  if (!farm) return false;
  if (!quiet) showBusy(true, `${farm.displayCode} 필지경계 조회 중`);
  try {
    const { data, error } = await client.functions.invoke("vworld-parcel-sync", {
      body: { farmlandId: farmId },
    });
    if (error) throw error;
    if (!quiet) toast(`${farm.displayCode} 필지경계를 저장했습니다.`);
    await reloadSnapshot();
    return Boolean(data?.ok);
  } catch (error) {
    console.error(error);
    if (!quiet) toast(`${farm.displayCode} 조회 실패: ${error.message ?? error}`, 5000);
    return false;
  } finally {
    if (!quiet) showBusy(false);
  }
}

$("syncAllBtn").addEventListener("click", async () => {
  const targets = state.snapshot.farmlands.filter((farm) =>
    !farm.geometry || !["exact", "gps_verified", "manual_verified"].includes(farm.locationStatus)
  );
  if (!targets.length) return;
  syncStopRequested = false;
  $("syncAllBtn").classList.add("hidden");
  $("stopSyncBtn").classList.remove("hidden");
  let success = 0;
  let failed = 0;
  try {
    for (let index = 0; index < targets.length; index += 1) {
      if (syncStopRequested) break;
      const farm = targets[index];
      $("syncProgress").textContent = `${index + 1}/${targets.length} · ${farm.displayCode} ${farm.fullAddress}\n성공 ${success} · 실패 ${failed}`;
      const ok = await syncOneFarm(farm.id, true);
      if (ok) success += 1; else failed += 1;
      await new Promise((resolve) => setTimeout(resolve, 650));
    }
  } finally {
    $("syncAllBtn").classList.remove("hidden");
    $("stopSyncBtn").classList.add("hidden");
    $("syncProgress").textContent = `${syncStopRequested ? "중지됨" : "완료"} · 성공 ${success} · 실패 ${failed}`;
    await reloadSnapshot();
  }
});
$("stopSyncBtn").addEventListener("click", () => {
  syncStopRequested = true;
  $("syncProgress").textContent += "\n현재 조회가 끝난 뒤 중지합니다.";
});

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 GPS를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 0,
    });
  });
}

async function registerGps(farmId) {
  if (!requireOnline()) return;
  showBusy(true, "현장 GPS 측정 중");
  try {
    const position = await getCurrentPosition();
    const { longitude, latitude, accuracy } = position.coords;
    const result = await rpc("register_gps_point", {
      p_farmland_id: farmId,
      p_longitude: longitude,
      p_latitude: latitude,
      p_accuracy_m: accuracy,
    }, { busy: false });
    await reloadSnapshot();
    focusFarm(farmId);
    toast(`GPS ${Math.round(accuracy)}m · ${result === "gps_verified" ? "필지 안에서 확인됨" : result === "gps_only" ? "GPS 점만 등록됨" : "검증 필요"}`, 4500);
  } catch (error) {
    toast(error.message ?? String(error), 5000);
  } finally {
    showBusy(false);
  }
}

function cancelDraw() {
  if (drawInteraction) map.removeInteraction(drawInteraction);
  drawInteraction = null;
  scratchSource.clear();
}

function beginManualDraw(farmId) {
  if (state.snapshot.profile?.role !== "admin") {
    toast("관리자만 경계를 직접 그릴 수 있습니다.");
    return;
  }
  closeDrawer();
  cancelDraw();
  state.selectedFarmId = farmId;
  renderSelectedFarm();
  scratchSource.clear();
  drawInteraction = new Draw({ source: scratchSource, type: "Polygon" });
  map.addInteraction(drawInteraction);
  toast("필지 외곽을 차례로 누르고 시작점을 다시 눌러 완료하세요.", 6000);

  drawInteraction.once("drawend", async (event) => {
    map.removeInteraction(drawInteraction);
    drawInteraction = null;
    const geometry = geojson.writeGeometryObject(event.feature.getGeometry(), {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
      decimals: 8,
    });
    if (!confirm("그린 경계를 이 농지의 검증된 경계로 저장하시겠습니까?")) {
      scratchSource.clear();
      return;
    }
    try {
      await rpc("save_manual_geometry", {
        p_farmland_id: farmId,
        p_geojson: geometry,
      }, { label: "필지 경계 저장 중" });
      scratchSource.clear();
      await reloadSnapshot();
      focusFarm(farmId);
      toast("직접 그린 필지 경계를 저장했습니다.");
    } catch (error) {
      toast(error.message ?? String(error), 5000);
    }
  });
}

$("gpsBtn").addEventListener("click", async () => {
  showBusy(true, "현재 위치 확인 중");
  try {
    const position = await getCurrentPosition();
    const { longitude, latitude, accuracy } = position.coords;
    map.getView().animate({ center: fromLonLat([longitude, latitude]), zoom: 18, duration: 500 });
    toast(`현재 위치 정확도 약 ${Math.round(accuracy)}m`);
  } catch (error) {
    toast(error.message ?? String(error), 5000);
  } finally {
    showBusy(false);
  }
});
$("fitAllBtn").addEventListener("click", fitAll);
$("closeSelectedBtn").addEventListener("click", () => {
  state.selectedFarmId = null;
  renderSelectedFarm();
  renderWaterPanel();
  parcelLayer.changed();
});
$("reloadBtn").addEventListener("click", () => reloadSnapshot(true));

function downloadBlob(filename, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("exportJsonBtn").addEventListener("click", () => {
  downloadBlob(
    `농지관리_온라인백업_${new Date().toISOString().slice(0,10)}.json`,
    "application/json;charset=utf-8",
    JSON.stringify(state.snapshot, null, 2),
  );
});
$("exportCsvBtn").addEventListener("click", () => {
  const columns = ["displayCode","ownerName","placeName","ri","jibun","fullAddress","areaSqm","variety","locationStatus","pnu"];
  const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
  const lines = [
    columns.join(","),
    ...state.snapshot.farmlands.map((farm) => columns.map((key) => quote(farm[key])).join(",")),
  ];
  downloadBlob(
    `농지목록_${new Date().toISOString().slice(0,10)}.csv`,
    "text/csv;charset=utf-8",
    "\ufeff" + lines.join("\n"),
  );
});

setInterval(renderWaterPanel, 30000);

async function bootstrap() {
  updateNetworkBadge();
  const config = configureFirstRun();
  if (!config) return;

  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  initMap();
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") location.reload();
    if (event === "SIGNED_IN" && session && authDialog.open) {
      authDialog.close();
      afterLogin();
    }
  });

  if (await ensureSession()) await afterLogin();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  toast(error.message ?? String(error), 7000);
});
