import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    exclude: ["build/", "dist/", "**/node_modules/**"],
  },
});
