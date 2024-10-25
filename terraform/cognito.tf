resource "aws_cognito_user_pool" "pnp_user_pool" {
  name = "pnp-app-user-pool"

  auto_verified_attributes = ["email"]
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
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
