#!/usr/bin/env bash

set -e

AWS_REGION="eu-central-1"

usage() {
  echo "Migrate users from one Cognito user pool to another."
  echo "Migrates email addresses. Users will receive a new sub (user ID) in the target pool"
  echo "and will need to reset their password on first login."
  echo ""
  echo "Usage: $0 --source-pool-id <id> --target-pool-id <id> --profile <aws_profile> [--dry-run]"
  echo ""
  echo "Options:"
  echo "  --source-pool-id  Source Cognito user pool ID"
  echo "  --target-pool-id  Target Cognito user pool ID"
  echo "  --profile         AWS CLI profile"
  echo "  --dry-run         Print users that would be migrated without making changes"
  echo ""
  echo "Note: The user sub (ID) cannot be preserved across pools. Cognito always generates"
  echo "a new sub for each user. If your application stores data keyed by sub (e.g. in"
  echo "DynamoDB), you will need to update those references after migration. The script"
  echo "outputs old and new sub mappings to help with this."
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

# Collect all users across paginated responses (list-users returns max 60 per call)
all_users="[]"
pagination_token=""

while true; do
  if [ -n "$pagination_token" ]; then
    response=$(aws cognito-idp list-users \
      --user-pool-id "$SOURCE_POOL_ID" \
      --pagination-token "$pagination_token" \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --output json)
  else
    response=$(aws cognito-idp list-users \
      --user-pool-id "$SOURCE_POOL_ID" \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --output json)
  fi

  page_users=$(echo "$response" | jq '.Users')
  all_users=$(echo "$all_users $page_users" | jq -s '.[0] + .[1]')

  pagination_token=$(echo "$response" | jq -r '.PaginationToken // empty')
  if [ -z "$pagination_token" ]; then
    break
  fi
  echo "  Fetched $(echo "$page_users" | jq 'length') users, fetching next page..."
done

user_count=$(echo "$all_users" | jq 'length')
echo "Found $user_count user(s) in source pool."

if [ "$user_count" -eq 0 ]; then
  echo "No users to migrate."
  exit 0
fi

echo ""
echo "Sub mapping (old -> new):"
echo "========================="

for i in $(seq 0 $((user_count - 1))); do
  user=$(echo "$all_users" | jq ".[$i]")
  old_sub=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "sub") | .Value')
  user_email=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "email") | .Value')
  email_verified=$(echo "$user" | jq -r '.Attributes[] | select(.Name == "email_verified") | .Value')

  echo ""
  echo "User $((i + 1))/$user_count:"
  echo "  Email:   $user_email"
  echo "  Old sub: $old_sub"

  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] Would create user in target pool"
    continue
  fi

  create_output=$(aws cognito-idp admin-create-user \
    --user-pool-id "$TARGET_POOL_ID" \
    --username "$user_email" \
    --user-attributes \
      Name="email",Value="$user_email" \
      Name="email_verified",Value="${email_verified:-true}" \
    --message-action SUPPRESS \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --output json)

  new_sub=$(echo "$create_output" | jq -r '.User.Attributes[] | select(.Name == "sub") | .Value')
  echo "  New sub: $new_sub"
  echo "  $old_sub -> $new_sub"
done

echo ""
echo "Migration complete. $user_count user(s) processed."
echo ""
echo "IMPORTANT:"
echo "  - Users must reset their password in the new pool."
echo "  - User subs have changed. If your application stores data keyed by user sub"
echo "    (e.g. userId in DynamoDB), you will need to update those references."
