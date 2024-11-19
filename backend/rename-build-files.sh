#!/usr/bin/env bash

build_dir="build/lambdas"

echo "Rename all .js files in '$build_dir' to .mjs so that AWS Lambda recognizes them as ES Modules"
find "$build_dir" -type f -name "*.js" | while read -r file; do
  new_file="${file%.js}.mjs"
  echo "Renaming $file -> $new_file"
  mv "$file" "$new_file"
done

echo "Renaming complete!"
