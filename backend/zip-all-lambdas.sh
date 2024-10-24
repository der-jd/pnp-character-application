#!/bin/bash

lambdas=("another-lambda" "skill-calculation")

for lambda in "${lambdas[@]}"
do
  echo "Zipping $lambda..."
  zip -r dist/$lambda.zip build/$lambda/*
done

echo "All Lambda functions zipped!"
