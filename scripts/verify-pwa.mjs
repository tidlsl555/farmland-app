import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const distDir = path.join(root, "dist");
const serviceWorkerPath = path.join(distDir, "sw.js");
const serviceWorkerSource = await readFile(serviceWorkerPath, "utf8");
const sandbox = {
  self: {
    addEventListener() {},
    location: { origin: "https://example.invalid" },
  },
};

vm.runInNewContext(
  `${serviceWorkerSource}\nglobalThis.__APP_SHELL__ = APP_SHELL;`,
  sandbox,
  { filename: serviceWorkerPath },
);

const appShell = sandbox.__APP_SHELL__;
if (!Array.isArray(appShell) || appShell.length === 0) {
  throw new Error("서비스워커 APP_SHELL 목록을 읽지 못했습니다.");
}

const normalize = (value) => {
  const pathname = String(value).split(/[?#]/, 1)[0].replace(/^\.\//, "");
  return pathname || ".";
};

const cachedPaths = new Set(appShell.map(normalize));
const missingFiles = [];

for (const entry of cachedPaths) {
  const target = entry === "." ? distDir : path.join(distDir, entry);
  try {
    await stat(target);
  } catch {
    missingFiles.push(entry);
  }
}

if (missingFiles.length) {
  throw new Error(`PWA 필수 파일이 빌드 결과에 없습니다: ${missingFiles.join(", ")}`);
}

const html = await readFile(path.join(distDir, "index.html"), "utf8");
const localReferences = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((value) => !/^(?:[a-z]+:|\/\/|#)/i.test(value))
  .map(normalize);

const uncachedReferences = [...new Set(localReferences)]
  .filter((value) => !cachedPaths.has(value));

if (uncachedReferences.length) {
  throw new Error(`index.html의 로컬 파일이 APP_SHELL에 없습니다: ${uncachedReferences.join(", ")}`);
}

console.log(`PWA 앱 셸 검증 완료 (${cachedPaths.size}개 파일)`);
