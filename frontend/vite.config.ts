import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const envDir = path.resolve(__dirname, "..");

export default defineConfig(({ command, mode }) => {
  const loaded = loadEnv(mode, envDir, "VITE_");
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? loaded.VITE_API_BASE_URL;

  if (command === "serve" && apiBaseUrl) {
    const host = new URL(apiBaseUrl).hostname;
    const isDevHost = /\b(dev|staging|local)\b/.test(host);
    if (!isDevHost) {
      throw new Error(
        `Refusing to start dev server: VITE_API_BASE_URL points to '${host}'. ` +
          "Use the dev backend for local development.",
      );
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "csp-injection",
        transformIndexHtml() {
          if (!apiBaseUrl) {
            throw new Error("VITE_API_BASE_URL must be set");
          }
          const apiOrigin = new URL(apiBaseUrl).origin;

          const csp =
            [
              "default-src 'self'",
              // SHA-256 hash of the inline theme script in index.html. Must be updated if that script changes.
              "script-src 'self' 'sha256-aB/1rsCzfUIDEEpMA5XLZBOA/g5rbud2FTGsqWNkOJw='",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              `connect-src 'self' ${apiOrigin} https://cognito-idp.eu-central-1.amazonaws.com`,
              "font-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; ") + ";";

          return [
            {
              tag: "meta",
              attrs: {
                "http-equiv": "Content-Security-Policy",
                content: csp,
              },
            },
          ];
        },
      },
    ],
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
