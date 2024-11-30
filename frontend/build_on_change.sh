#!/usr/bin/env bash

BRANCH_NAME=$1
ARTIFACTS_DIR="./artifacts/$BRANCH_NAME"
CHECKSUM_FILE=""


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
    -print0 | tar --null -cf - --files-from=- | md5sum > checksum.txt

# Take the current branch cache, if not there (eg. first commit), look for the main cache,
# if the main cache is inaccessible, default to building and deploying the frontend
if [ ! -d "$ARTIFACTS_DIR" ]; then
    CHECKSUM_FILE="$ARTIFACTS_DIR/checksum.txt"
else
    ARTIFACTS_DIR="./artifacts/main"
    if [ -d "$ARTIFACTS_DIR" ]; then
        CHECKSUM_FILE="$ARTIFACTS_DIR/checksum.txt"
    fi
fi

if [ "$CHECKSUM_FILE" = "" ]; then
    echo "No Checksum file found, regenerating build!"
else

    diff $CHECKSUM_FILE checksum.txt > /dev/null
    if [ $? -eq 0 ]; then
        echo "No changes detected in frontend folder, skipping build!"
        rm -f checksum.txt
        exit 0
    else
        echo "Detected changes in frontend folder! regenerating build files!"
    fi
fi

mkdir -p "./artifacts/$BRANCH_NAME"
mv checksum.txt "./artifacts/$BRANCH_NAME"

rm -rf build
npm run build
mv out build
rm -f checksum.txt