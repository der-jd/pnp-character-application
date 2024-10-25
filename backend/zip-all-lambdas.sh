#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

lambdas=("another-lambda" "skill-calculation")

mkdir --parents dist
for lambda in "${lambdas[@]}"
do
  echo "Zipping $lambda..."
  zip -r -j dist/$lambda.zip build/$lambda/*
done

echo "All Lambda functions zipped!"
