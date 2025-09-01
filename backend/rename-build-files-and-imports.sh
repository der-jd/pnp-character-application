#!/usr/bin/env bash

set -e # Exit immediately if any command exits with a non-zero status

build_dir="build"

echo "Rename all .js files in '$build_dir' to .mjs so that AWS Lambda recognizes them as ES Modules"
find "$build_dir" -type f -name "*.js" | while read -r file; do
  new_file="${file%.js}.mjs"
  echo "Renaming $file -> $new_file"
  mv "$file" "$new_file"
done
echo "Renaming complete!"

echo "Replacing all '.js' imports in the JavaScript files to '.mjs' imports..."

# Detect OS for portable sed usage
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS BSD sed
  sed_inplace_option=(-i '')
else
  # GNU sed (Linux)
  sed_inplace_option=(-i)
fi

# Use -E for extended regex (portable)
find "$build_dir" -type f -name "*.mjs" -exec sed "${sed_inplace_option[@]}" -E 's/from[[:space:]]+"([a-zA-Z0-9_/.-]+)\.js"/from "\1.mjs"/g' {} +
echo "Replaced all imports!"
