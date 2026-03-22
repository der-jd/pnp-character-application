import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const frontendModules = path.resolve(__dirname, "./node_modules");

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure frontend's node_modules (with React 19) takes precedence over root's (React 18)
    modules: [frontendModules, "node_modules"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("https://api.test.example.com/v1"),
    "import.meta.env.VITE_COGNITO_REGION": JSON.stringify("eu-central-1"),
    "import.meta.env.VITE_COGNITO_APP_CLIENT_ID": JSON.stringify("test-client-id"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
