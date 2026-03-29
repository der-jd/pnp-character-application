import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const envDir = path.resolve(__dirname, "..");
const devApiHostPattern = /\b(dev|staging|local)\b/;

export default defineConfig(({ command, mode }) => {
  if (command === "serve") {
    const loaded = loadEnv(mode, envDir, "VITE_");
    const apiBaseUrl = process.env.VITE_API_BASE_URL ?? loaded.VITE_API_BASE_URL;

    if (apiBaseUrl && !devApiHostPattern.test(new URL(apiBaseUrl).hostname)) {
      throw new Error(
        `Refusing to start dev server: VITE_API_BASE_URL points to '${new URL(apiBaseUrl).hostname}'. ` +
          "Use the dev backend for local development.",
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    envDir,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
    },
  };
});
