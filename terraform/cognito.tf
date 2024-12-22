resource "aws_cognito_user_pool" "pnp_user_pool" {
  name = "pnp-app-user-pool"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
    invite_message_template {
      email_message = "Your username is '{username}' and temporary password is: {####}"
      email_subject = "Your temporary password for PnP-Application"
      sms_message   = "Your username is '{username}' and temporary password is: {####}"
    }
  }

  alias_attributes = ["email"]

  auto_verified_attributes = ["email"]

  //deletion_protection = "ACTIVE" // TODO activate protection after Cognito pool is properly set up

  password_policy {
    minimum_length                   = 16
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 1
  }

  mfa_configuration = "ON"
  software_token_mfa_configuration {
    enabled = true
  }

  // Keep the original attribute value active when an updated value is pending
  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  username_configuration {
    case_sensitive = true
  }

  verification_message_template {
    default_email_option  = "CONFIRM_WITH_LINK"
    email_subject_by_link = "Verify your email address"
  }
}

# Cognito App Client (Frontend will use this to initiate login)
resource "aws_cognito_user_pool_client" "pnp_user_pool_client" {
  name                                 = "pnp-app-pool-client"
  user_pool_id                         = aws_cognito_user_pool.pnp_user_pool.id
  allowed_oauth_flows                  = ["implicit"]
  allowed_oauth_scopes                 = ["email", "openid"]
  callback_urls                        = ["https://${aws_cloudfront_distribution.frontend_distribution.domain_name}"]
  logout_urls                          = ["https://${aws_cloudfront_distribution.frontend_distribution.domain_name}/logout"]
  allowed_oauth_flows_user_pool_client = true
  explicit_auth_flows                  = ["ALLOW_CUSTOM_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH", "ALLOW_USER_SRP_AUTH"]
  access_token_validity                = 12
  id_token_validity                    = 12
  refresh_token_validity               = 1

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

}

resource "aws_cognito_identity_pool" "pnp_identity_pool" {
  identity_pool_name               = "pnp-app-identity-pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id     = aws_cognito_user_pool_client.pnp_user_pool_client.id
    provider_name = aws_cognito_user_pool.pnp_user_pool.endpoint
  }
}

resource "aws_api_gateway_authorizer" "cognito_authorizer" {
  rest_api_id     = aws_api_gateway_rest_api.pnp_rest_api.id
  name            = "CognitoAuthorizer"
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"
  provider_arns   = [aws_cognito_user_pool.pnp_user_pool.arn]
}

output "cognito_user_pool_id" {
  value     = aws_cognito_user_pool.pnp_user_pool.id
  sensitive = true
}

output "cognito_app_client_id" {
  value     = aws_cognito_user_pool_client.pnp_user_pool_client.id
  sensitive = true
}
