import { createClient } from "npm:@supabase/supabase-js@2";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VWORLD_API_KEY = Deno.env.get("VWORLD_API_KEY") ?? "";
const VWORLD_DOMAIN = Deno.env.get("VWORLD_DOMAIN") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  const allowed = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeRi(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/월오리리/g, "월오리")
    .replace(/읍부리리/g, "읍부리")
    .replace(/우분리/g, "우본리");
}

function normalizeJibun(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^0+(\d)/, "$1")
    .replace(/-0+(\d)/, "-$1");
}

function parsePossiblyJsonp(text: string): any {
  const clean = text.trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/^[\w$.]+\s*\(([\s\S]*)\)\s*;?\s*$/);
    if (!match) throw new Error("브이월드 응답을 JSON으로 해석할 수 없습니다.");
    return JSON.parse(match[1]);
  }
}

async function fetchText(url: URL, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "farmland-boundary-app/1.0" },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`브이월드 HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function getParcelCoordinate(address: string) {
  const url = new URL("https://api.vworld.kr/req/address");
  const params: Record<string, string> = {
    service: "address",
    request: "getcoord",
    crs: "EPSG:4326",
    address,
    format: "json",
    type: "PARCEL",
    key: VWORLD_API_KEY,
  };
  if (VWORLD_DOMAIN) params.domain = VWORLD_DOMAIN;
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const payload = JSON.parse(await fetchText(url));
  const response = payload?.response;
  if (response?.status !== "OK" || !response?.result?.point) {
    const message = response?.error?.text ?? response?.status ?? "주소 좌표 없음";
    throw new Error(`지번 주소 조회 실패: ${message}`);
  }
  const longitude = Number(response.result.point.x);
  const latitude = Number(response.result.point.y);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("주소 좌표가 숫자가 아닙니다.");
  }
  return { longitude, latitude, raw: payload };
}

async function getWfsFeatures(
  longitude: number,
  latitude: number,
  halfSizeDegrees: number,
) {
  const minX = longitude - halfSizeDegrees;
  const minY = latitude - halfSizeDegrees;
  const maxX = longitude + halfSizeDegrees;
  const maxY = latitude + halfSizeDegrees;

  for (const output of ["application/json", "text/javascript"]) {
    const url = new URL("https://api.vworld.kr/req/wfs");
    const params: Record<string, string> = {
      key: VWORLD_API_KEY,
      SERVICE: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      TYPENAME: "lt_c_landinfobasemap",
      OUTPUT: output,
      SRSNAME: "EPSG:4326",
      BBOX: `${minX},${minY},${maxX},${maxY}`,
    };
    if (VWORLD_DOMAIN) params.domain = VWORLD_DOMAIN;
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    try {
      const parsed = parsePossiblyJsonp(await fetchText(url));
      const features = Array.isArray(parsed?.features) ? parsed.features : [];
      if (features.length > 0 || output === "text/javascript") return { parsed, features };
    } catch (error) {
      if (output === "text/javascript") throw error;
    }
  }
  return { parsed: {}, features: [] };
}

function firstCoordinate(geometry: any): number[] | null {
  let cursor = geometry?.coordinates;
  while (Array.isArray(cursor) && Array.isArray(cursor[0])) cursor = cursor[0];
  return Array.isArray(cursor) && cursor.length >= 2 ? cursor : null;
}

function swapCoordinates(value: any): any {
  if (!Array.isArray(value)) return value;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [value[1], value[0], ...value.slice(2)];
  }
  return value.map(swapCoordinates);
}

function normalizeGeometry(geometry: any) {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
    throw new Error("WFS 결과가 필지 폴리곤이 아닙니다.");
  }
  const coordinate = firstCoordinate(geometry);
  if (!coordinate) throw new Error("필지 폴리곤 좌표가 비어 있습니다.");

  const [x, y] = coordinate;
  const normal = x >= 124 && x <= 132 && y >= 33 && y <= 39.5;
  const swapped = y >= 124 && y <= 132 && x >= 33 && x <= 39.5;
  if (normal) return geometry;
  if (swapped) return { ...geometry, coordinates: swapCoordinates(geometry.coordinates) };
  throw new Error("필지 폴리곤 좌표계가 EPSG:4326 범위가 아닙니다.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "POST만 허용됩니다." });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(req, 500, { error: "Supabase 함수 환경변수가 없습니다." });
  }
  if (!VWORLD_API_KEY) {
    return jsonResponse(req, 500, { error: "VWORLD_API_KEY 비밀값이 없습니다." });
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(req, 401, { error: "로그인이 필요합니다." });
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("org_id,role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return jsonResponse(req, 403, { error: "관리자만 필지 경계를 조회할 수 있습니다." });
  }

  let body: { farmlandId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { error: "JSON 요청이 필요합니다." });
  }
  if (!body.farmlandId) return jsonResponse(req, 400, { error: "farmlandId가 필요합니다." });

  const { data: farm, error: farmError } = await adminClient
    .from("farmlands")
    .select("id,org_id,ri,jibun,full_address,display_code")
    .eq("id", body.farmlandId)
    .eq("org_id", profile.org_id)
    .single();

  if (farmError || !farm) return jsonResponse(req, 404, { error: "농지를 찾을 수 없습니다." });

  try {
    const point = await getParcelCoordinate(farm.full_address);
    const expectedRi = normalizeRi(farm.ri);
    const expectedJibun = normalizeJibun(farm.jibun);
    let candidates: any[] = [];

    for (const radius of [0.0005, 0.0015, 0.004]) {
      const result = await getWfsFeatures(point.longitude, point.latitude, radius);
      candidates = result.features;
      const exact = candidates.find((feature: any) => {
        const properties = feature?.properties ?? {};
        return normalizeRi(properties.ri_nm) === expectedRi &&
          normalizeJibun(properties.jibun) === expectedJibun;
      });

      if (exact) {
        const geometry = normalizeGeometry(exact.geometry);
        const properties = {
          ...(exact.properties ?? {}),
          addressLookup: point.raw,
          queryAddress: farm.full_address,
          exactMatch: true,
        };
        const { error } = await adminClient.rpc("admin_apply_vworld_result", {
          p_farmland_id: farm.id,
          p_pnu: String(exact.properties?.pnu ?? ""),
          p_geometry: geometry,
          p_properties: properties,
        });
        if (error) throw error;
        return jsonResponse(req, 200, {
          ok: true,
          farmlandId: farm.id,
          displayCode: farm.display_code,
          status: "exact",
          pnu: exact.properties?.pnu ?? null,
          address: farm.full_address,
        });
      }
    }

    const candidateSummary = candidates.slice(0, 20).map((feature: any) => ({
      pnu: feature?.properties?.pnu ?? null,
      ri: feature?.properties?.ri_nm ?? null,
      jibun: feature?.properties?.jibun ?? null,
    }));
    const message = `주소 좌표 주변에서 ${farm.ri} ${farm.jibun}과 정확히 일치하는 필지를 찾지 못했습니다.`;
    await adminClient.rpc("admin_record_lookup_failure", {
      p_farmland_id: farm.id,
      p_error: message,
      p_properties: {
        addressLookup: point.raw,
        queryAddress: farm.full_address,
        candidates: candidateSummary,
      },
    });
    return jsonResponse(req, 422, {
      ok: false,
      farmlandId: farm.id,
      displayCode: farm.display_code,
      status: "lookup_failed",
      error: message,
      candidates: candidateSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await adminClient.rpc("admin_record_lookup_failure", {
      p_farmland_id: farm.id,
      p_error: message,
      p_properties: { queryAddress: farm.full_address },
    });
    return jsonResponse(req, 500, {
      ok: false,
      farmlandId: farm.id,
      displayCode: farm.display_code,
      status: "lookup_failed",
      error: message,
    });
  }
});
