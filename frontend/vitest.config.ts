import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,

    // Include source files for coverage
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "src/app/**", // Exclude Next.js app directory from coverage for now
      ],
      include: ["src/lib/**/*", "src/hooks/**/*", "src/stores/**/*", "src/components/**/*"],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    // Test file patterns
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    // Exclude api-schema tests from regular test runs (they need LocalStack)
    // They can be run explicitly via: npm run api-schema-tests:run
    exclude: [
      "node_modules/",
      "dist/",
      ".next/",
      "coverage/",
      ...(process.env.INCLUDE_API_SCHEMA_TESTS !== "true" ? ["**/src/test/api-schema/**"] : []),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/stores": path.resolve(__dirname, "./src/stores"),
      "@/components": path.resolve(__dirname, "./src/components"),
    },
  },
});
