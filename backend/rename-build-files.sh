#!/usr/bin/env bash

build_dir="build"

echo "Rename all .js files in '$build_dir' to .mjs"
find "$build_dir" -type f -name "*.js" | while read -r file; do
  new_file="${file%.js}.mjs"
  echo "Renaming $file -> $new_file"
  mv "$file" "$new_file"
done

echo "Renaming complete!"
