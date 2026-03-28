#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly AWS_REGION="eu-central-1"
readonly USER_POOL_NAME_BASE="pnp-app-user-pool"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Create a Cognito test user in the environment-specific user pool.

OPTIONS:
  -u, --user-email EMAIL         User email address (required)
  -p, --profile PROFILE          AWS profile name (required)
  -e, --env ENV                  Environment name for resource suffix, e.g. dev or prod (required)
  -r, --region REGION            AWS region (default: $AWS_REGION)
  --help                         Show this help message

EXAMPLES:
  $SCRIPT_NAME -u test@example.com -p my-aws-profile -e dev
  $SCRIPT_NAME -u test@example.com -p my-aws-profile -e prod -r eu-central-1

EOF
}

validate_environment() {
  local environment="$1"

  case "$environment" in
    dev|prod)
      ;;
    *)
      echo "Error: Environment must be one of: dev, prod. Received '$environment'."
      exit 1
      ;;
  esac
}

get_user_pool_name() {
  local environment="$1"
  echo "$USER_POOL_NAME_BASE-$environment"
}

user_mail=""
aws_profile=""
environment=""
aws_region="$AWS_REGION"

while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--user-email)
      user_mail="$2"
      shift 2
      ;;
    -p|--profile)
      aws_profile="$2"
      shift 2
      ;;
    -e|--env)
      environment="$2"
      shift 2
      ;;
    -r|--region)
      aws_region="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$user_mail" ]]; then
  echo "Error: Missing user email address. Use -u or --user-email to specify it."
  usage
  exit 1
fi

if [[ -z "$aws_profile" ]]; then
  echo "Error: Missing AWS profile. Use -p or --profile to specify it."
  usage
  exit 1
fi

if [[ -z "$environment" ]]; then
  echo "Error: Missing environment. Use -e or --env to specify it."
  usage
  exit 1
fi

validate_environment "$environment"

user_pool_name=$(get_user_pool_name "$environment")

# Suppress AWS CLI pager output --> write output of AWS CLI commands directly to the console
export AWS_PAGER=""

generate_password() {
  openssl rand -base64 32
}

echo "Getting AWS Cognito user pool id for '$user_pool_name'..."
user_pool_id=$(aws cognito-idp list-user-pools \
    --query "UserPools[?Name=='$user_pool_name'].Id" \
    --max-results 50 \
    --output text \
    --profile "$aws_profile" \
    --region "$aws_region")

if [[ -z "$user_pool_id" || "$user_pool_id" == "None" ]]; then
  echo "Error: Could not find Cognito user pool '$user_pool_name' in region '$aws_region'."
  exit 1
fi

echo "Creating new Cognito user..."
# Suppress invitation email as the temporary password will be overwritten below
aws cognito-idp admin-create-user \
    --user-pool-id "$user_pool_id" \
    --username "$user_mail" \
    --user-attributes Name="email",Value="$user_mail" Name="email_verified",Value="true" \
    --message-action SUPPRESS \
    --profile "$aws_profile" \
    --region "$aws_region"

echo "Updating temporary password..."
user_password=$(generate_password)
aws cognito-idp admin-set-user-password \
    --user-pool-id "$user_pool_id" \
    --username "$user_mail" \
    --password "$user_password" \
    --permanent \
    --profile "$aws_profile" \
    --region "$aws_region"

echo "New test user created. Use the following password to log in."
echo "$user_password"
