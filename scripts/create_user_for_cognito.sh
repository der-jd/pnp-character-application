#!/usr/bin/env bash

set -e

AWS_REGION="eu-central-1"
USER_POOL_NAME="pnp-app-user-pool"

if [ -z "$1" ]; then
  echo "Error: Missing user email address as input parameter!"
  echo "Usage: $0 <user_mail_address> <aws_profile>"
  exit 1
fi

if [ -z "$2" ]; then
  echo "Error: Missing AWS profile!"
  echo "Usage: $0 <user_mail_address> <aws_profile>"
  exit 1
fi

user_mail=$1
aws_profile=$2

# Suppress AWS CLI pager output --> write output of AWS CLI commands directly to the console
export AWS_PAGER=""

generate_password() {
  openssl rand -base64 32
}

echo "Getting AWS Cognito user pool id for '$USER_POOL_NAME'..."
user_pool_id=$(aws cognito-idp list-user-pools \
    --query "UserPools[?Name=='$USER_POOL_NAME'].Id" \
    --max-results 50 \
    --output text \
    --profile $aws_profile \
    --region $AWS_REGION)

echo "Creating new Cognito user..."
# Suppress invitation email as the temporary password will be overwritten below
aws cognito-idp admin-create-user \
    --user-pool-id $user_pool_id \
    --username $user_mail \
    --user-attributes Name="email",Value="$user_mail" Name="email_verified",Value="true" \
    --message-action SUPPRESS \
    --profile $aws_profile \
    --region $AWS_REGION

echo "Updating temporary password..."
user_password=$(generate_password)
aws cognito-idp admin-set-user-password \
    --user-pool-id $user_pool_id \
    --username $user_mail \
    --password $user_password \
    --permanent \
    --profile $aws_profile \
    --region $AWS_REGION

echo "New test user created. Use the following password to log in."
echo "$user_password"
