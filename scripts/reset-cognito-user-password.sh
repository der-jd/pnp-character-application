#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly AWS_REGION="eu-central-1"
readonly USER_POOL_NAME_BASE="pnp-app-user-pool"

usage() {
  cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Reset a Cognito user's password. Sets a temporary password that the user
must change on next login (FORCE_CHANGE_PASSWORD).

The temporary password is generated automatically and printed to the console.
You must deliver it to the user out-of-band (e.g. in person, via chat).

Note: The user pool uses "admin_only" account recovery, so password resets
cannot be done via the AWS Console or self-service — only via this script.

OPTIONS:
  -u, --user-email EMAIL         User email address (required)
  -p, --profile PROFILE          AWS profile name (required)
  -e, --env ENV                  Environment name, e.g. dev or prod (required)
  -r, --region REGION            AWS region (default: $AWS_REGION)
  --permanent                    Set as permanent password (user won't be forced to change it)
  --help                         Show this help message

EXAMPLES:
  $SCRIPT_NAME -u user@example.com -p my-aws-profile -e dev
  $SCRIPT_NAME -u user@example.com -p my-aws-profile -e prod --permanent

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

generate_password() {
  openssl rand -base64 32
}

user_mail=""
aws_profile=""
environment=""
aws_region="$AWS_REGION"
permanent=false

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
    --permanent)
      permanent=true
      shift
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

echo "Resetting password for user '$user_mail' in pool '$user_pool_name'..."
new_password=$(generate_password)

permanent_flag=""
if [[ "$permanent" == true ]]; then
  permanent_flag="--permanent"
fi

aws cognito-idp admin-set-user-password \
    --user-pool-id "$user_pool_id" \
    --username "$user_mail" \
    --password "$new_password" \
    $permanent_flag \
    --profile "$aws_profile" \
    --region "$aws_region"

echo "Signing out all existing sessions..."
aws cognito-idp admin-user-global-sign-out \
    --user-pool-id "$user_pool_id" \
    --username "$user_mail" \
    --profile "$aws_profile" \
    --region "$aws_region"

echo ""
echo "Password reset successful. All existing sessions have been invalidated."
if [[ "$permanent" == true ]]; then
  echo "The password has been set as permanent."
else
  echo "The user will be forced to set a new password on next login."
fi
echo ""
echo "New password: $new_password"
