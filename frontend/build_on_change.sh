#!/usr/bin/env bash

CACHED_CHECKSUM="checksum.txt"

# Check the frontend directory for changes and rebuild the frontend if changes are detected
# Note: This excludes certain files of the frontend folder


find . -type f \( \
    -path './src/*' \
    -o -path './public/*' \
    -o -path './lib/*' \
    -o -path './components/*' \
    -o -name 'src' \
    -o -name 'public' \
    -o -name 'lib' \
    -o -name 'components' \) \
    ! -name 'checksum.txt' \
    ! -name 'build_on_change.sh' \
    -exec md5sum {} \; > current_checksum.txt
    
if [ ! -f "$CACHED_CHECKSUM" ]; then
    echo "No Checksum file found, regenerating build!"
else
    diff $CACHED_CHECKSUM current_checksum.txt > /dev/null
    if [ $? -eq 0 ]; then
        echo "No changes detected in frontend folder, checking bucket content!"
        
        # The bucket should be at least accessible
        if ! aws s3 ls s3://pnp-character-application-frontend --region eu-central-1 > /dev/null 2>&1; then
            echo "Bucket does not exist or access is restricted, please check terraform setup!"
            echo "Skipping build since the upload destination is inaccessible"
            exit 2
        fi
        
        BUCKET_EMPTY=$(aws s3 ls s3://pnp-character-application-frontend --region eu-central-1 --recursive)

        # Bucket should be empty if recreated, in this case we want to build and deploy
        if [ -n "$BUCKET_EMPTY" ]; then
            echo "Bucket populated, skipping build!"
            exit 0
        fi
        
        echo "Bucket is empty! Regenerating build files"
    else
        echo "Detected changes in frontend folder! Regenerating build files!"
    fi
fi

rm -rf build
npm run build
mv out build

aws s3 sync build s3://pnp-character-application-frontend --region eu-central-1

rm -f checksum.txt
mv current_checksum.txt checksum.txt
