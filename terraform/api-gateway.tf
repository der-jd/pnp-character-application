resource "aws_api_gateway_rest_api" "pnp_rest_api" {
  name        = "pnp-app-api"
  description = "REST API for the PnP character application"
  endpoint_configuration {
    // Distribute the regional API only via our own CloudFront distribution.
    // See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html#api-gateway-api-endpoint-types-regional
    types = ["REGIONAL"]
  }
}

// ================== characters & skills ==================

resource "aws_api_gateway_resource" "characters" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "characters" // .../characters
}

resource "aws_api_gateway_resource" "character_id" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.characters.id
  path_part   = "{character-id}" // .../characters/{character-id}
}

resource "aws_api_gateway_method" "character_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.character_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_integration" "character_id_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.character_id.id
  http_method             = aws_api_gateway_method.character_id_get.http_method
  integration_http_method = "GET"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_character_lambda.invoke_arn
}

resource "aws_api_gateway_resource" "skills" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "skills" // .../characters/{character-id}/skills
}

resource "aws_api_gateway_resource" "skill_category" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.skills.id
  path_part   = "{skill-category}" // .../characters/{character-id}/skills/{skill-category}
}

resource "aws_api_gateway_resource" "skill_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.skill_category.id
  path_part   = "{skill-name}" // .../characters/{character-id}/skills/{skill-category}/{skill-name}
}

resource "aws_api_gateway_method" "skill_name_get" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.skill_name.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  request_parameters = {
    "method.request.querystring.learning_method" = true // .../characters/{character-id}/skills/{skill-category}/{skill-name}?{learning-method}"
  }
}

resource "aws_api_gateway_integration" "skill_name_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.skill_name.id
  http_method             = aws_api_gateway_method.skill_name_get.http_method
  integration_http_method = "GET"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_skill_increase_cost_lambda.invoke_arn
}

resource "aws_api_gateway_method" "skill_name_patch" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.skill_name.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_integration" "skill_name_patch_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.skill_name.id
  http_method             = aws_api_gateway_method.skill_name_patch.http_method
  integration_http_method = "PATCH"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.increase_skill_lambda.invoke_arn
}

resource "aws_api_gateway_method" "skill_name_options" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.skill_name.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "skill_name_options_response" {
  depends_on  = [aws_api_gateway_method.skill_name_options]
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_options.http_method

  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

resource "aws_api_gateway_integration" "skill_name_options_integration" {
  depends_on  = [aws_api_gateway_method.skill_name_options]
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode(
      {
        statusCode = 200
      }
    )
  }
}

resource "aws_api_gateway_integration_response" "skill_name_options_integration_response" {
  depends_on = [aws_api_gateway_integration.skill_name_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

// ================== tenant-id ==================

resource "aws_api_gateway_resource" "tenant_id" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "tenant-id"
}

resource "aws_api_gateway_method" "tenant_id_post" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.tenant_id.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
}

resource "aws_api_gateway_integration" "tenant_id_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.tenant_id.id
  http_method             = aws_api_gateway_method.tenant_id_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_tenant_id_lambda.invoke_arn
}

resource "aws_api_gateway_method" "tenant_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.tenant_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tenant_id_options_integration" {

  depends_on = [aws_api_gateway_method.tenant_id_options]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.tenant_id.id
  http_method = aws_api_gateway_method.tenant_id_options.http_method
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

resource "aws_api_gateway_integration_response" "tenant_id_options_integration_response" {

  depends_on = [aws_api_gateway_integration.tenant_id_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.tenant_id.id
  http_method = aws_api_gateway_method.tenant_id_options.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,RefreshToken'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "tenant_id_options_response" {
  depends_on = [aws_api_gateway_method.tenant_id_options]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.tenant_id.id
  http_method = aws_api_gateway_method.tenant_id_options.http_method

  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_integration.skill_name_patch_integration,
    aws_api_gateway_integration.tenant_id_post_integration,
    aws_api_gateway_integration.skill_name_get_integration
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
