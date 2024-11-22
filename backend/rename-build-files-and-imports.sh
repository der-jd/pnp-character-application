#!/usr/bin/env bash

build_dir="build"

echo "Rename all .js files in '$build_dir' to .mjs so that AWS Lambda recognizes them as ES Modules"
find "$build_dir" -type f -name "*.js" | while read -r file; do
  new_file="${file%.js}.mjs"
  echo "Renaming $file -> $new_file"
  mv "$file" "$new_file"
done
echo "Renaming complete!"

echo "Replace all '.js' imports in the JavaScript files to '.mjs' imports"
find "$build_dir" -type f -name "*.mjs" -exec sed -i '' -E 's/from[[:space:]]+"([a-zA-Z0-9_/.-]+)\.js"/from "\1.mjs"/g' {} +
echo "Replaced all imports!"
