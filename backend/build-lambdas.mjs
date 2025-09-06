#!/usr/bin/env node

import { build } from "esbuild";
import { readdir, mkdir } from "fs/promises";
import { join } from "path";

const srcDir = "src";
const buildDir = "build";

async function buildLambdas() {
  console.log("🚀 Building Lambda functions with esbuild...");

  // Get all Lambda function directories
  const lambdasSrcDir = join(srcDir, "lambdas");
  const lambdasBuildDir = join(buildDir, "src", "lambdas");

  try {
    const lambdaDirs = await readdir(lambdasSrcDir, { withFileTypes: true });
    const lambdaNames = lambdaDirs.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

    console.log(`📦 Found ${lambdaNames.length} Lambda functions:`, lambdaNames.join(", "));

    // Ensure build directory exists
    await mkdir(lambdasBuildDir, { recursive: true });

    // Build each Lambda function
    const buildPromises = lambdaNames.map(async (lambdaName) => {
      const entryPoint = join(lambdasSrcDir, lambdaName, "index.ts");
      const outfile = join(lambdasBuildDir, lambdaName, "index.mjs");

      console.log(`📦 Building ${lambdaName}...`);

      // https://esbuild.github.io/api/
      await build({
        entryPoints: [entryPoint],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "esm",
        outfile: outfile,
        external: [
          // AWS SDK is provided by Lambda runtime
          "@aws-sdk/*",
          "aws-sdk",
          // Node.js built-ins - explicitly externalized since platform: "node"
          // doesn't seem to work reliably with ESM format
          "buffer",
          "crypto",
          "events",
          "fs",
          "path",
          "stream",
          "util",
          "os",
          "url",
          "querystring",
          "http",
          "https",
          "zlib",
        ],
        minify: true,
        sourcemap: false, // Can enable for debugging
        // Keep the same import behavior as your current setup
        resolveExtensions: [".ts", ".js", ".mjs"],
        // Handle your current import paths
        conditions: ["import", "node"],
        mainFields: ["module", "main"],
      });

      console.log(`✅ Built ${lambdaName}`);
    });

    await Promise.all(buildPromises);

    console.log("🎉 All Lambda functions built successfully!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

async function buildLambdaLayers() {
  console.log("🔧 Building Lambda layers...");

  // Build config package
  const configSrcDir = join(srcDir, "config");
  const configBuildDir = join(buildDir, "src", "config");

  await mkdir(configBuildDir, { recursive: true });

  await build({
    entryPoints: [join(configSrcDir, "index.ts")],
    bundle: false, // Keep individual files for layers
    platform: "node",
    target: "node20",
    format: "esm",
    outdir: configBuildDir,
    outExtension: { ".js": ".mjs" },
  });

  // Build utils package
  const utilsSrcDir = join(srcDir, "utils");
  const utilsBuildDir = join(buildDir, "src", "utils");

  await mkdir(utilsBuildDir, { recursive: true });

  await build({
    entryPoints: [join(utilsSrcDir, "index.ts")],
    bundle: false, // Keep individual files for layers
    platform: "node",
    target: "node20",
    format: "esm",
    outdir: utilsBuildDir,
    outExtension: { ".js": ".mjs" },
  });

  console.log("✅ Lambda layers built successfully!");
}

// Main build process
async function main() {
  try {
    await buildLambdas();
    await buildLambdaLayers();
    console.log("🎉 All builds completed successfully!");
  } catch (error) {
    console.error("❌ Build process failed:", error);
    process.exit(1);
  }
}

main();
