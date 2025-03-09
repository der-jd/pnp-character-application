#!/usr/bin/env bash

set -e

usage() {
  echo "Wrapper script for convert_character_xml_to_json.ts to convert a v6.1 XML character file to JSON."
  echo "Usage: $0 <input_file_path> <output_file_path_without_extension>"
  exit 1
}

if [ -z "$1" ]; then
  echo "Error: Input file path is required."
  usage
  exit 1
fi

if [ -z "$2" ]; then
  echo "Error: Output file path without extension is required."
  usage
  exit 1
fi

npm run build

node ./build/scripts/convert_character_xml_to_json.js --input "$1" --output "$2"
