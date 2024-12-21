#!/usr/bin/env bash

set -e

AWS_REGION="eu-central-1"
USER_POOL_NAME="pnp-app-user-pool"

if [ -z "$1" ]; then
  echo "Error: Missing user mail address as input parameter!"
  echo "Usage: $0 <user_mail_address>"
  exit 1
fi

if [ -z "$2" ]; then
  echo "Error: Missing AWS profile!"
  echo "Usage: $0 <user_mail_address> <aws_profile>"
  exit 1
fi

user_mail=$1
aws_profile=$2

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

echo "Creating new test user..."
user_name="test$((RANDOM % 1000))" # Random number from 1 to 999
user_password=$(generate_password)
echo $(aws cognito-idp admin-create-user \
    --user-pool-id $user_pool_id \
    --username $user_name \
    --user-attributes Name=email,Value=$user_mail \
    --desired-delivery-mediums EMAIL \
    --profile $aws_profile \
    --region $AWS_REGION)

echo "Updating temporary password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id $user_pool_id \
    --username $user_name \
    --password $user_password \
    --permanent \
    --profile $aws_profile \
    --region $AWS_REGION


#aws cognito-idp admin-set-user-mfa-preference \
 #   --user-pool-id <your_user_pool_id> \
  #  --username <username> \
   # --sms-mfa-settings Enabled=true,PreferredMfa=true
    #--region $AWS_REGION

echo "New test user '$user_name' created. Use the following password to log in."
echo "$user_password"
