#!/usr/bin/env bash

CACHED_CHECKSUM="checksum.txt"

# Check the frontend directory for changes and rebuild the frontend if changes are detected
# Note: This excludes certain files of the frontend folder

find . -type f \( \
    -path './src/*' \
    -o -path './public/*' \
    -o -path './node_modules/*' \
    -o -path './lib/*' \
    -o -path './components/*' \
    -o -name 'src' \
    -o -name 'public' \
    -o -name 'node_modules' \
    -o -name 'lib' \
    -o -name 'components' \) \
    ! -name 'checksum.txt' \
    -exec md5sum {} + | md5sum > current_checksum.txt


if [ ! -f "$CACHED_CHECKSUM" ]; then
    echo "No Checksum file found, regenerating build!"
else
    diff $CACHED_CHECKSUM current_checksum.txt > /dev/null
    if [ $? -eq 0 ]; then
        echo "No changes detected in frontend folder, skipping build!"
        exit 0
    else
        echo "Detected changes in frontend folder! regenerating build files!"
    fi
fi

rm -rf build
npm run build
mv out build