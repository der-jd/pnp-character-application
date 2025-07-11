#!/usr/bin/env bash

AWS_REGION="eu-central-1"
CACHED_CHECKSUM="checksum.txt"

if [ -z "$1" ]; then
  echo "Error: Missing file with env variables!"
  echo "Usage: $0 <file_with_env_variables>"
  exit 1
fi

file_env_variables=$1

# Check the frontend directory for changes and rebuild the frontend if changes are detected
# Note: This excludes certain files of the frontend folder.
# Note: If the s3 bucket is empty, an upload will take place even if the frontend did not change

find . -type f \( \
    -path './src/lib*' -or \
    -path './src/hooks*' -or \
    -path './src/app*' -or \
    -path './public/*' \) -and \
    ! -name 'checksum.txt' \
    ! -name 'build_on_change.sh' \
    -exec md5sum {} \; | tee -a current_checksum.txt

if [ -f "$file_env_variables" ]; then
    md5sum $file_env_variables| tee -a current_checksum.txt
else
    echo "Error: No terraform output file specified, exiting..."
    exit 2
fi

if [ ! -f "$CACHED_CHECKSUM" ]; then
    echo "No Checksum file found, regenerating build!"
else

    echo "Current checksum: $(md5sum current_checksum.txt)"
    echo "Old checksum: $(md5sum $CACHED_CHECKSUM)"

    diff $CACHED_CHECKSUM current_checksum.txt > /dev/null
    if [ $? -eq 0 ]; then
        echo "No changes detected in frontend folder, checking bucket content!"

        # The bucket should be at least accessible
        if ! aws s3 ls s3://pnp-character-application-frontend --region $AWS_REGION > /dev/null 2>&1; then
            echo "Bucket does not exist or access is restricted, please check terraform setup!"
            echo "Skipping build since the upload destination is inaccessible"
            exit 2
        fi

        BUCKET_EMPTY=$(aws s3 ls s3://pnp-character-application-frontend --region $AWS_REGION --recursive)

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

aws s3 sync build s3://pnp-character-application-frontend --delete --region $AWS_REGION

rm -f checksum.txt
mv current_checksum.txt checksum.txt
