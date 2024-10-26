#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status (relevant for the "for"-loop)
set -e

lambdas=("another-lambda" "skill-calculation")

mkdir --parents dist
for lambda in "${lambdas[@]}"
do
  echo "Zipping code for $lambda..."
  zip -r -j dist/$lambda.zip build/$lambda/*
done

echo "Code for all Lambda functions zipped!"
