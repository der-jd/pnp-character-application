#!/usr/bin/env bash

set -e

AWS_REGION="eu-central-1"

usage() {
  echo "Migrate users from one Cognito user pool to another."
  echo "Preserves user ID (sub) and email. Users will need to reset their password in the new pool."
  echo ""
  echo "Usage: $0 --source-pool-id <id> --target-pool-id <id> --profile <aws_profile> [--dry-run]"
  echo ""
  echo "Options:"
  echo "  --source-pool-id  Source Cognito user pool ID"
  echo "  --target-pool-id  Target Cognito user pool ID"
  echo "  --profile         AWS CLI profile"
  echo "  --dry-run         Print users that would be migrated without making changes"
  exit 1
}

DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --source-pool-id) SOURCE_POOL_ID="$2"; shift 2 ;;
    --target-pool-id) TARGET_POOL_ID="$2"; shift 2 ;;
    --profile) AWS_PROFILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) usage ;;
  esac
done

if [ -z "$SOURCE_POOL_ID" ] || [ -z "$TARGET_POOL_ID" ] || [ -z "$AWS_PROFILE" ]; then
  usage
fi

# Suppress AWS CLI pager output
export AWS_PAGER=""

echo "Fetching users from source pool $SOURCE_POOL_ID..."

users_json=$(aws cognito-idp list-users \
  --user-pool-id "$SOURCE_POOL_ID" \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --output json)

user_count=$(echo "$users_json" | jq '.Users | length')
echo "Found $user_count user(s) in source pool."

if [ "$user_count" -eq 0 ]; then
  echo "No users to migrate."
  exit 0
fi

echo ""

for i in $(seq 0 $((user_count - 1))); do
  user=$(echo "$users_json" | jq ".Users[$i]")
  username=$(echo "$user" | jq -r '.Username')
  user_sub=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "sub") | .Value')
  user_email=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "email") | .Value')
  email_verified=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "email_verified") | .Value')

  echo "User $((i + 1))/$user_count:"
  echo "  Sub:   $user_sub"
  echo "  Email: $user_email"

  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] Would create user in target pool"
    echo ""
    continue
  fi

  echo "  Creating user in target pool..."
  aws cognito-idp admin-create-user \
    --user-pool-id "$TARGET_POOL_ID" \
    --username "$user_sub" \
    --user-attributes \
      Name="email",Value="$user_email" \
      Name="email_verified",Value="${email_verified:-true}" \
    --message-action SUPPRESS \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION"

  echo "  User created. They will need to reset their password on first login."
  echo ""
done

echo "Migration complete. $user_count user(s) processed."
echo ""
echo "IMPORTANT: Users must reset their password in the new pool."
echo "Passwords cannot be migrated between Cognito user pools."
