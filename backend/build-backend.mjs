#!/usr/bin/env node

import { build } from "esbuild";
import { readdir, mkdir } from "fs/promises";
import { join } from "path";

const SRC_DIR = "src";
const BUILD_DIR = "build";

async function buildCommonPackages() {
  console.log("🔧 Building common packages...");

  // Build core package
  const coreSrcDir = join(SRC_DIR, "core");
  const coreBuildDir = join(BUILD_DIR, "src", "core");

  await mkdir(coreBuildDir, { recursive: true });

  await build({
    entryPoints: [join(coreSrcDir, "index.ts")],
    bundle: false, // Keep individual files for common packages
    platform: "node",
    target: "node20",
    format: "esm",
    outdir: coreBuildDir,
    outExtension: { ".js": ".mjs" },
  });

  console.log("✅ Common packages built successfully!");
}

async function buildLambdas() {
  console.log("🚀 Building Lambda functions with esbuild...");

  // Get all Lambda function directories
  const lambdasSrcDir = join(SRC_DIR, "lambdas");
  const lambdasBuildDir = join(BUILD_DIR, "src", "lambdas");

  try {
    const lambdaDirs = await readdir(lambdasSrcDir, { withFileTypes: true });
    const lambdaNames = lambdaDirs.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);

    console.log(`📦 Found ${lambdaNames.length} Lambda functions:`, lambdaNames.join(", "));

    // Ensure build directory exists
    await mkdir(lambdasBuildDir, { recursive: true });

    // Build each Lambda function
    const buildPromises = lambdaNames.map(async (lambdaName) => {
      const entryPoint = join(lambdasSrcDir, lambdaName, "index.ts");
      const outfile = join(lambdasBuildDir, lambdaName, "index.js");

      console.log(`📦 Building ${lambdaName}...`);

      // https://esbuild.github.io/api/
      await build({
        entryPoints: [entryPoint],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        outfile: outfile,
        external: [
          // AWS SDK is provided by Lambda runtime
          "@aws-sdk/*",
          "aws-sdk",
        ],
        minify: true,
        sourcemap: false, // needed for debugging
        resolveExtensions: [".ts", ".js", ".mjs"],
        // Handle the current import paths
        conditions: ["require", "node"],
        mainFields: ["main", "module"],
        // Ensure proper CommonJS exports
        banner: {
          js: '"use strict";',
        },
        footer: {
          js: 'if (typeof exports.handler === "undefined" && typeof handler !== "undefined") { exports.handler = handler; }',
        },
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

// Main build process
async function main() {
  try {
    await buildCommonPackages();
    await buildLambdas();
    console.log("🎉 All builds completed successfully!");
  } catch (error) {
    console.error("❌ Build process failed:", error);
    process.exit(1);
  }
}

main();
