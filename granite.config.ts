import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "dulpick",
  brand: {
    displayName: "둘픽",
    primaryColor: "#130537",
    icon: "assets/img-character.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
