#!/usr/bin/env bash

set -e # Exit immediately if any command exits with a non-zero status. Needed for the for loop below

start_dir=$PWD
lambdas_build_dir="build/src/lambdas"
lambda_layers_build_dir="build/src/lambda-layers"
src_dir="src"
lambda_layers_src_dir="$src_dir/lambda-layers"

# Gather the names of all subdirectories (Lambda functions) in the lambdas_build_dir
lambdas=()
while IFS= read -r -d '' dir; do
  lambdas+=("$(basename "$dir")")
done < <(find "$lambdas_build_dir" -mindepth 1 -maxdepth 1 -type d -print0)

echo "Include dependencies for Lambda functions"
for lambda in "${lambdas[@]}"
do
  echo "Copying package*.json files..."
  lambda_dest_dir="$lambdas_build_dir/$lambda"
  cp --verbose $src_dir/lambdas/$lambda/package*.json $lambda_dest_dir

  echo "Installing prod dependencies in $lambda_dest_dir..."
  cd $lambda_dest_dir
  npm ci --omit=dev

  cd $start_dir
done

# Gather the names of all subdirectories (Lambda Layers) in the lambda_layers_build_dir
lambda_layers=()
while IFS= read -r -d '' dir; do
  lambda_layers+=("$(basename "$dir")")
done < <(find "$lambda_layers_src_dir" -mindepth 1 -maxdepth 1 -type d -print0)

echo ""
echo "========================================================="
echo ""

# https://docs.aws.amazon.com/lambda/latest/dg/typescript-layers.html
echo "Include dependencies for Lambda Layers"
for layer in "${lambda_layers[@]}"
do
  echo "Copying package*.json files..."
  layer_dest_dir="$lambda_layers_build_dir/$layer"
  mkdir --parent $layer_dest_dir
  cp --verbose $lambda_layers_src_dir/$layer/package*.json $layer_dest_dir

  echo "Installing prod dependencies in $layer_dest_dir..."
  cd $layer_dest_dir
  local_package_dir_relative_to_layer_dir="../../$layer" # NOTE: package dir must have the same name as the layer. Otherwise the path is wrong!
  # Use --install-links to install transitive dependencies from local packages
  npm ci --install-links $local_package_dir_relative_to_layer_dir --omit=dev

  echo "Moving dependencies into required sub folder for Lambda Layer..."
  mkdir nodejs
  cp --verbose --recursive --dereference node_modules nodejs
  rm --recursive node_modules

  cd $start_dir
done

echo "All dependencies installed!"
