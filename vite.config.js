import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  if (command === "build" && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error("배포 환경변수 SUPABASE_URL과 SUPABASE_ANON_KEY(또는 SUPABASE_PUBLISHABLE_KEY)가 필요합니다.");
  }
  if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
    throw new Error("SUPABASE_URL 형식이 올바르지 않습니다.");
  }

  const runtimeConfig = JSON.stringify({
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    supabaseAnonKey
  }).replaceAll("<", "\\u003c");

  return {
    base: "./",
    plugins: [{
      name: "farmland-runtime-config",
      transformIndexHtml(html) {
        return html.replace(
          "<!-- farmland-runtime-config -->",
          '<script src="./runtime-config.js"></script>'
        );
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "runtime-config.js",
          source: `window.FARMLAND_APP_CONFIG=${runtimeConfig};\n`
        });
      }
    }],
    build: {
      target: "es2022",
      sourcemap: false,
      assetsDir: "assets"
    }
  };
});
