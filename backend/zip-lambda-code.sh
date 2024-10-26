#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status (relevant for the "for"-loop)
set -e

build_dir="build"
dist_dir="dist"

# Gather the names of all subdirectories (Lambda functions) in the build_dir
lambdas=()
while IFS= read -r -d '' dir; do
  lambdas+=("$(basename "$dir")")
done < <(find "$build_dir" -mindepth 1 -maxdepth 1 -type d -print0)

mkdir --parents $dist_dir

echo "Package Lambda code in '$build_dir' directory"
for lambda in "${lambdas[@]}"
do
  echo "Zipping code for $lambda..."
  zip -r -j $dist_dir/$lambda.zip $build_dir/$lambda/*
done

echo "Zip files created and saved in '$dist_dir'!"
