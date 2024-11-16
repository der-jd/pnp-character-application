#!/usr/bin/env bash

lambda_build_dir="build/lambdas"

mkdir --parents $lambda_build_dir

echo "Rename all .js files in '$lambda_build_dir' to .mjs"
find "$lambda_build_dir" -type f -name "*.js" | while read -r file; do
  new_file="${file%.js}.mjs"
  echo "Renaming $file -> $new_file"
  mv "$file" "$new_file"
done

echo "Renaming complete!"
