// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { type ConfigEnv } from "vite";
import { developmentEnvironment } from "./src/lib/ai/environment.server";

const config = defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

export default (env: ConfigEnv) => {
  if (env.command === "serve") {
    // .env is reserved for production; custom .env_dev is server-only.
    const local = developmentEnvironment(process.cwd());
    for (const [key, value] of Object.entries(local)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
  return config(env);
};
