resource "aws_cognito_user_pool" "pnp_user_pool" {
  name = "pnp-app-user-pool"

  auto_verified_attributes = ["email"]
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  schema {
    name                     = "custom:tenant_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = false
    required                 = false
    string_attribute_constraints {
      max_length = 50
      min_length = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

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
  
  write_attributes = ["custom:tenant_id", "email", "openid"]
  read_attributes  = ["custom:tenant_id", "email", "openid"]

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
