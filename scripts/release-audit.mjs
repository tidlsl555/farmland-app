import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const read = (name) => readFile(path.join(dist, name), "utf8");
const fail = (message) => { throw new Error(`[release-audit] ${message}`); };
const check = (condition, message) => { if (!condition) fail(message); };

const [html, sw, pwa2, pwa3, bundle, runtimeConfig] = await Promise.all([
  read("index.html"),
  read("sw.js"),
  read("pwa-inline-2.js"),
  read("pwa-inline-3.js"),
  read("assets/app.js"),
  read("runtime-config.js"),
]);

// 1) Release artifact integrity.
for (const ref of ["./runtime-config.js", "./pwa-inline-1.js", "./pwa-inline-2.js", "./pwa-inline-3.js", "./assets/app.js"]) {
  check(html.includes(ref), `index.html에서 ${ref} 참조를 찾지 못했습니다.`);
}
check(/CACHE_VERSION\s*=\s*['"]farmland-pwa-v/i.test(sw), "서비스워커 캐시 버전이 없습니다.");
check(sw.includes("fetch(request)") && sw.includes("caches.match(request)"), "동일 출처 네트워크 우선/캐시 폴백을 확인할 수 없습니다.");
check(pwa3.includes("controllerchange") && pwa3.includes("location.reload()"), "서비스워커 교체 후 열린 페이지 갱신 로직이 없습니다.");

// 2) Seed data invariants. This validates source identity only; it does NOT certify field coordinates.
const startMarker = "const seededParcels = ";
const start = pwa2.indexOf(startMarker);
check(start >= 0, "seededParcels를 찾지 못했습니다.");
const jsonStart = start + startMarker.length;
const end = pwa2.indexOf(";\n  const defaultTasks", jsonStart);
check(end > jsonStart, "seededParcels JSON 끝을 찾지 못했습니다.");
const parcels = JSON.parse(pwa2.slice(jsonStart, end));
check(parcels.length === 81, `농지 seed가 81개가 아닙니다: ${parcels.length}`);
check(new Set(parcels.map((p) => p.id)).size === 81, "농지 ID 중복이 있습니다.");
check(new Set(parcels.map((p) => p.address)).size === 81, "농지 주소 중복이 있습니다.");
for (const parcel of parcels) {
  check(parcel.id && parcel.address, "ID 또는 주소가 비어 있는 농지가 있습니다.");
}

// 3) Security boundaries: only client publishable configuration may reach dist.
const frontend = [html, sw, pwa2, pwa3, bundle, runtimeConfig].join("\n");
for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "VWORLD_API_KEY"]) {
  check(!frontend.includes(forbidden), `${forbidden} 문자열이 브라우저 배포물에 포함되어 있습니다.`);
}
check(!/sb_secret_[A-Za-z0-9_-]+/.test(frontend), "Supabase secret key 형식이 브라우저 배포물에 포함되어 있습니다.");

// 4) Truthful persistence mode.
check(bundle.includes("기기 저장 모드"), "비로그인 세션을 기기 저장 모드로 명시하지 않습니다.");
check(bundle.includes("app_states") && bundle.includes("postgres_changes"), "인증 세션의 서버 상태/Realtime 경로를 확인할 수 없습니다.");

// 5) Architecture blocker: release candidate must not depend on a hard-coded secondary VWorld gateway.
check(
  !bundle.includes("wormmanager.netlify.app/.netlify/functions/vworld-boundary"),
  "P0: 배포 번들에 Netlify VWorld 함수 주소가 하드코딩되어 있습니다. Supabase Edge Function 등 단일 서버 경로로 통합하세요.",
);

console.log(`[release-audit] PASS: seed ${parcels.length}개, ID/주소 고유, PWA 기본 무결성, 클라이언트 비밀키 차단, 저장 모드 표기 확인`);
console.log("[release-audit] 주의: 이 검사는 81필지 실제 좌표, 휴대폰 GPS, 두 기기 동기화, 오프라인 충돌, DB 백업복구를 검증하지 않습니다.");
