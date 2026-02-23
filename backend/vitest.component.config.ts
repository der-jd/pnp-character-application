import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// Dynamically discover all packages by finding directories with package.json files
function discoverPackages() {
  const alias: Record<string, string> = {};

  // Add src-level packages
  const srcDir = path.resolve(__dirname, "src");
  const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of srcEntries) {
    if (entry.isDirectory()) {
      const packageJsonPath = path.join(srcDir, entry.name, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
          alias[packageJson.name] = path.join(srcDir, entry.name);
        } catch (error) {
          console.warn(`Failed to parse package.json at ${packageJsonPath}`, error);
        }
      }
    }
  }

  // Add lambda packages
  const lambdasDir = path.resolve(__dirname, "src/lambdas");
  if (fs.existsSync(lambdasDir)) {
    const lambdaEntries = fs.readdirSync(lambdasDir, { withFileTypes: true });

    for (const entry of lambdaEntries) {
      if (entry.isDirectory()) {
        const packageJsonPath = path.join(lambdasDir, entry.name, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            alias[packageJson.name] = path.join(lambdasDir, entry.name);
          } catch (error) {
            console.warn(`Failed to parse package.json at ${packageJsonPath}`, error);
          }
        }
      }
    }
  }

  return alias;
}

export default defineConfig({
  test: {
    setupFiles: ["./test/component-tests/setup.ts"],
    exclude: ["build/", "dist/", "**/node_modules/**", "test/unit-tests/**"],
    environment: "node",
    testTimeout: 15000, // Increased timeout to 15 seconds for endpoints that may take longer to execute
    hookTimeout: 15000, // Increased hook timeout to 15 seconds for setup that may take longer
    sequence: {
      // TODO revert after test
      //concurrent: true, // Allow parallel and therefore faster execution of test files
      concurrent: false,
    },
    // TODO revert after test
    // maxWorkers: 3, // Limited to 3 to avoid throttling by AWS Lambda
    maxWorkers: 1,
  },
  resolve: {
    alias: discoverPackages(),
  },
});
