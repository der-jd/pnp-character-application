#!/usr/bin/env bash

set -e # Exit immediately if any command exits with a non-zero status. Needed for the for loop below

start_dir=$PWD
build_dir="build"
lambda_build_dir="$build_dir/lambdas"
src_dir="src/lambdas"

# Gather the names of all subdirectories (Lambda functions) in the lambda_build_dir
lambdas=()
while IFS= read -r -d '' dir; do
  lambdas+=("$(basename "$dir")")
done < <(find "$lambda_build_dir" -mindepth 1 -maxdepth 1 -type d -print0)

echo "Include dependencies in Lambda code"
for lambda in "${lambdas[@]}"
do
  echo "Copying relative dependencies..."
  cp --verbose $build_dir/*.js $lambda_build_dir/$lambda

  echo "Copying package*.json files..."
  cp --verbose $src_dir/$lambda/package*.json $lambda_build_dir/$lambda

  echo "Installing prod dependencies in $lambda_build_dir/$lambda..."
  cd $lambda_build_dir/$lambda
  npm install --omit=dev

  cd $start_dir
done

echo "All dependencies installed!"
