#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status (relevant for the "for"-loop)
set -e

build_dir="build"
dist_dir="dist"
lambdas=("another-lambda" "skill-calculation")

mkdir --parents $dist_dir

echo "Package Lambda code in '$build_dir' directory"
for lambda in "${lambdas[@]}"
do
  echo "Zipping code for $lambda..."
  zip -r -j $dist_dir/$lambda.zip $build_dir/$lambda/*
done

echo "Zip files created and saved in '$dist_dir'!"
