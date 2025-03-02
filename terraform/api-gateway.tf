resource "aws_api_gateway_rest_api" "pnp_rest_api" {
  name        = "pnp-app-api"
  description = "REST API for the PnP character application"
  endpoint_configuration {
    // Distribute the regional API only via our own CloudFront distribution.
    // See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html#api-gateway-api-endpoint-types-regional
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "increase_skill_resource" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "increase-skill"
}

resource "aws_api_gateway_method" "increase_skill_method" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.increase_skill_resource.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_integration" "increase_skill_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.increase_skill_resource.id
  http_method             = aws_api_gateway_method.increase_skill_method.http_method
  integration_http_method = "PATCH"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.increase_skill_lambda.invoke_arn
}

resource "aws_api_gateway_resource" "get_skill_increase_cost_resource" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "get-skill-increase-cost"
}

resource "aws_api_gateway_method" "get_skill_increase_cost_method" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.get_skill_increase_cost_resource.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_integration" "get_skill_increase_cost_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.get_skill_increase_cost_resource.id
  http_method             = aws_api_gateway_method.get_skill_increase_cost_method.http_method
  integration_http_method = "GET"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_skill_increase_cost_lambda.invoke_arn
}

resource "aws_api_gateway_resource" "create_tenant_id_resource" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "tenant-id"
}

resource "aws_api_gateway_method" "create_tenant_id_method" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.create_tenant_id_resource.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_integration" "create_tenant_id_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.create_tenant_id_resource.id
  http_method             = aws_api_gateway_method.create_tenant_id_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_tenant_id_lambda.invoke_arn
}

resource "aws_api_gateway_method" "create_tenant_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.create_tenant_id_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "create_tenant_id_options_integration" {

  depends_on = [aws_api_gateway_method.create_tenant_id_options]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.create_tenant_id_resource.id
  http_method = aws_api_gateway_method.create_tenant_id_options.http_method
  type        = "MOCK"

  // see https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html#how-to-mock-integration-request-examples
  // For a method with the mock integration to return a 200 response, configure the 
  // integration request body mapping template to return the following:
  request_templates = {
    "application/json" = jsonencode(
      {
        statusCode = 200
      }
    )
  }
}

resource "aws_api_gateway_integration_response" "create_tenant_id_options_integration_response" {

  depends_on = [aws_api_gateway_integration.create_tenant_id_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.create_tenant_id_resource.id
  http_method = aws_api_gateway_method.create_tenant_id_options.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,RefreshToken'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "create_tenant_id_options_response" {
  depends_on = [aws_api_gateway_method.create_tenant_id_options]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.create_tenant_id_resource.id
  http_method = aws_api_gateway_method.create_tenant_id_options.http_method

  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

resource "aws_api_gateway_method" "increase_skill_options" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.increase_skill_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "increase_skill_options_response" {
  depends_on  = [aws_api_gateway_method.increase_skill_options]
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.increase_skill_resource.id
  http_method = aws_api_gateway_method.increase_skill_options.http_method

  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

resource "aws_api_gateway_integration" "increase_skill_options_integration" {
  depends_on  = [aws_api_gateway_method.increase_skill_options]
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.increase_skill_resource.id
  http_method = aws_api_gateway_method.increase_skill_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode(
      {
        statusCode = 200
      }
    )
  }
}

resource "aws_api_gateway_integration_response" "increase_skill_options_integragion_response" {
  depends_on = [aws_api_gateway_integration.increase_skill_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.increase_skill_resource.id
  http_method = aws_api_gateway_method.increase_skill_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method" "get_skill_increase_cost_options" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.get_skill_increase_cost_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_skill_increase_cost_options_integration" {
  depends_on  = [aws_api_gateway_method.get_skill_increase_cost_options]
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.get_skill_increase_cost_resource.id
  http_method = aws_api_gateway_method.get_skill_increase_cost_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode(
      {
        statusCode = 200
      }
    )
  }
}

resource "aws_api_gateway_integration_response" "get_skill_increase_cost_options_integration_response" {
  depends_on = [aws_api_gateway_integration.get_skill_increase_cost_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.get_skill_increase_cost_resource.id
  http_method = aws_api_gateway_method.get_skill_increase_cost_options.http_method

  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "get_skill_increase_cost_options_response" {

  depends_on = [aws_api_gateway_method.get_skill_increase_cost_options]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.get_skill_increase_cost_resource.id
  http_method = aws_api_gateway_method.get_skill_increase_cost_options.http_method

  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_integration.increase_skill_integration,
    aws_api_gateway_integration.create_tenant_id_integration,
    aws_api_gateway_integration.get_skill_increase_cost_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  triggers = {
    redeployment = md5(file("api-gateway.tf"))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  stage_name    = "prod"
}

output "api_gateway_url" {
  value     = "https://${aws_api_gateway_rest_api.pnp_rest_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}"
  sensitive = true
}