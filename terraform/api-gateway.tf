variable "status_codes" {
  type    = list(string)
  default = ["400", "401", "403", "404", "500", "200"]
}

resource "aws_iam_role" "api_gateway_role" {
  name = "apigateway-stepfunction-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "api_gateway_policy" {
  name = "AllowStartSyncExecution"
  role = aws_iam_role.api_gateway_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = "states:StartSyncExecution",
      Resource = aws_sfn_state_machine.increase_skill_state_machine.arn
    }]
  })
}


resource "aws_api_gateway_rest_api" "pnp_rest_api" {
  name        = "pnp-app-api"
  description = "REST API for the PnP character application"
  endpoint_configuration {
    // Distribute the regional API only via our own CloudFront distribution.
    // See https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html#api-gateway-api-endpoint-types-regional
    types = ["REGIONAL"]
  }
}

// ================== characters get  ==================

resource "aws_api_gateway_resource" "characters" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "characters" // .../characters
}

resource "aws_api_gateway_method" "characters_get" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.characters.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  request_parameters = {
    "method.request.querystring.character-short" = true
  }
}

resource "aws_api_gateway_method_response" "characters_get_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
  http_method = aws_api_gateway_method.characters_get.http_method
  status_code = each.value

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration" "characters_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.characters.id
  http_method             = aws_api_gateway_method.characters_get.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = aws_lambda_function.get_characters_lambda.invoke_arn
  request_parameters = {
    "integration.request.querystring.character-short" = "method.request.querystring.character-short"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      "body": $input.json('$'),
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      },
      "queryStringParameters": {
        #foreach($param in $input.params().querystring.keySet())
        "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"
        #if($foreach.hasNext),#end
        #end
      }
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "characters_get_integration_response" {
  depends_on = [aws_api_gateway_integration.characters_get_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
  http_method = aws_api_gateway_method.characters_get.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }

  response_templates = {
    "application/json" = <<EOT
    #set($rawBody = $input.json('$.body'))
    #set($parsedBody = $util.parseJson($rawBody))
    #set($status = $input.json('$.statusCode'))
    #if($status == 400)
        #set($context.responseOverride.status = 400)
    #end
    #if($status == 401)
        #set($context.responseOverride.status = 401)
    #end
    #if($status == 403)
        #set($context.responseOverride.status = 403)
    #end
    #if($status == 404)
        #set($context.responseOverride.status = 404)
    #end
    #if($status == 500)
        #set($context.responseOverride.status = 500)
    #end
    $parsedBody
    EOT
  }

  selection_pattern = ".*"
}

resource "aws_api_gateway_method" "characters_options" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
  http_method = "OPTIONS"
  // Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_integration" "characters_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
  http_method = aws_api_gateway_method.characters_options.http_method
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

resource "aws_api_gateway_integration_response" "characters_options_integration_response" {
  depends_on = [aws_api_gateway_integration.characters_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
  http_method = aws_api_gateway_method.characters_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }
}

resource "aws_api_gateway_method_response" "characters_options_method_response" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
  http_method = aws_api_gateway_method.characters_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
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
  request_parameters = {
    "method.request.path.character-id" = true
  }
}

resource "aws_api_gateway_method_response" "character_id_get_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
  http_method = aws_api_gateway_method.character_id_get.http_method
  status_code = each.value

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration" "character_id_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.character_id.id
  http_method             = aws_api_gateway_method.character_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = aws_lambda_function.get_character_lambda.invoke_arn
  request_parameters = {
    "integration.request.path.character-id" = "method.request.path.character-id"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      "body": $input.json('$'),
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      },
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      }
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "character_id_get_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
  http_method = aws_api_gateway_method.character_id_get.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }

  /**
   * This overwrites the response integrations status code with the status code from the Lambda response.
   * This is necessary because the Lambda function returns a status code in the body of the response, which
   * is not the status code of the HTTP response. The status code of the HTTP response is always 200 if left unchanged
   * See: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-override-request-response-parameters.html
   * Note that using #set($context.responseOverride.status = $lambdaReply.statusCode) does not work
   */
  response_templates = {
    "application/json" = <<EOT
    #set($rawBody = $input.json('$.body'))
    #set($parsedBody = $util.parseJson($rawBody))
    #set($status = $input.json('$.statusCode'))
    #if($status == 400)
        #set($context.responseOverride.status = 400)
    #end
    #if($status == 401)
        #set($context.responseOverride.status = 401)
    #end
    #if($status == 403)
        #set($context.responseOverride.status = 403)
    #end
    #if($status == 404)
        #set($context.responseOverride.status = 404)
    #end
    #if($status == 500)
        #set($context.responseOverride.status = 500)
    #end
    $parsedBody
    EOT
  }

  /**
   * API Gateway uses Java pattern-style regexes for selecting the correct response integration. Since
   * we want to select the integration for all status codes, we use the regex ".*" which matches everything.
   * See: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-method-settings-execution-console.html Section 8
   * See: https://aws.amazon.com/blogs/compute/error-handling-patterns-in-amazon-api-gateway-and-aws-lambda/
   */
  selection_pattern = ".*"
}

resource "aws_api_gateway_method" "character_id_options" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
  http_method = "OPTIONS"
  // Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_integration" "character_id_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
  http_method = aws_api_gateway_method.character_id_options.http_method
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

resource "aws_api_gateway_integration_response" "character_id_options_integration_response" {
  depends_on = [aws_api_gateway_integration.character_id_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
  http_method = aws_api_gateway_method.character_id_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }
}

resource "aws_api_gateway_method_response" "character_id_options_method_response" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
  http_method = aws_api_gateway_method.character_id_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

// ================== history ==================

resource "aws_api_gateway_resource" "history" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "history" // .../characters/{character-id}/history
}

resource "aws_api_gateway_method" "history_post" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  request_parameters = {
    "method.request.path.character-id" = true
  }
}

resource "aws_api_gateway_method_response" "history_post_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_post.http_method
  status_code = each.value

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration" "history_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.history.id
  http_method             = aws_api_gateway_method.history_post.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:eu-central-1:states:action/StartSyncExecution"
  credentials             = aws_iam_role.api_gateway_role.arn
  request_parameters = {
    "integration.request.path.character-id" = "method.request.path.character-id"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      "input": {
        "body": $input.json('$'),
        "pathParameters": {
          #foreach($param in $input.params().path.keySet())
          "$param": "$util.escapeJavaScript($input.params().path.get($param))"
          #if($foreach.hasNext),#end
          #end
        },
        "headers": {
          #foreach($param in $input.params().header.keySet())
          "$param": "$util.escapeJavaScript($input.params().header.get($param))"
          #if($foreach.hasNext),#end
          #end
        }
        "stateMachineArn": "${aws_sfn_state_machine.increase_skill_state_machine.arn}"
      }
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "history_post_integration_response" {
  depends_on = [aws_api_gateway_integration.history_post_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_post.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
  }

  /**
   * This overwrites the response integrations status code with the status code from the Lambda response.
   * This is necessary because the Lambda function returns a status code in the body of the response, which
   * is not the status code of the HTTP response. The status code of the HTTP response is always 200 if left unchanged
   * See: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-override-request-response-parameters.html
   * Note that using #set($context.responseOverride.status = $lambdaReply.statusCode) does not work
   */
  response_templates = {
    "application/json" = <<EOT
    #set($rawBody = $input.json('$.body'))
    #set($parsedBody = $util.parseJson($rawBody))
    #set($status = $input.json('$.statusCode'))
    #if($status == 400)
        #set($context.responseOverride.status = 400)
    #end
    #if($status == 401)
        #set($context.responseOverride.status = 401)
    #end
    #if($status == 403)
        #set($context.responseOverride.status = 403)
    #end
    #if($status == 404)
        #set($context.responseOverride.status = 404)
    #end
    #if($status == 500)
        #set($context.responseOverride.status = 500)
    #end
    $parsedBody
    EOT
  }

  /**
   * API Gateway uses Java pattern-style regexes for selecting the correct response integration. Since
   * we want to select the integration for all status codes, we use the regex ".*" which matches everything.
   * See: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-method-settings-execution-console.html Section 8
   * See: https://aws.amazon.com/blogs/compute/error-handling-patterns-in-amazon-api-gateway-and-aws-lambda/
   */
  selection_pattern = ".*"
}

resource "aws_api_gateway_method" "history_options" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = "OPTIONS"
  // Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_method_response" "history_options_method_response" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
  }
}

resource "aws_api_gateway_integration" "history_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_options.http_method
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

resource "aws_api_gateway_integration_response" "history_options_integration_response" {
  depends_on = [aws_api_gateway_integration.history_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }
}

// ================== skills  ==================

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
  // .../characters/{character-id}/skills/{skill-category}/{skill-name}?{learning-method}"
  request_parameters = {
    "method.request.path.character-id"           = true
    "method.request.path.skill-category"         = true
    "method.request.path.skill-name"             = true
    "method.request.querystring.learning-method" = true
  }
}

resource "aws_api_gateway_method_response" "skill_name_get_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_get.http_method
  status_code = each.value

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration" "skill_name_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.skill_name.id
  http_method             = aws_api_gateway_method.skill_name_get.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = aws_lambda_function.get_skill_increase_cost_lambda.invoke_arn
  request_parameters = {
    "integration.request.path.character-id"           = "method.request.path.character-id"
    "integration.request.path.skill-category"         = "method.request.path.skill-category"
    "integration.request.path.skill-name"             = "method.request.path.skill-name"
    "integration.request.querystring.learning-method" = "method.request.querystring.learning-method"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      "body": $input.json('$'),
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      },
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      },
      "queryStringParameters": {
        #foreach($param in $input.params().querystring.keySet())
        "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"
        #if($foreach.hasNext),#end
        #end
      }
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "skill_name_get_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_get.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }

  response_templates = {
    "application/json" = <<EOT
    #set($rawBody = $input.json('$.body'))
    #set($parsedBody = $util.parseJson($rawBody))
    #set($status = $input.json('$.statusCode'))
    #if($status == 400)
        #set($context.responseOverride.status = 400)
    #end
    #if($status == 401)
        #set($context.responseOverride.status = 401)
    #end
    #if($status == 403)
        #set($context.responseOverride.status = 403)
    #end
    #if($status == 404)
        #set($context.responseOverride.status = 404)
    #end
    #if($status == 500)
        #set($context.responseOverride.status = 500)
    #end
    $parsedBody
    EOT
  }

  selection_pattern = ".*"
}

resource "aws_api_gateway_method" "skill_name_patch" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.skill_name.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  request_parameters = {
    "method.request.path.character-id"   = true
    "method.request.path.skill-category" = true
    "method.request.path.skill-name"     = true
  }
}

resource "aws_api_gateway_method_response" "skill_name_patch_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_patch.http_method
  status_code = each.value

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}


resource "aws_api_gateway_integration" "skill_name_patch_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.skill_name.id
  http_method             = aws_api_gateway_method.skill_name_patch.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = aws_lambda_function.increase_skill_lambda.invoke_arn
  request_parameters = {
    "integration.request.path.character-id"   = "method.request.path.character-id"
    "integration.request.path.skill-category" = "method.request.path.skill-category"
    "integration.request.path.skill-name"     = "method.request.path.skill-name"
  }
  // TODO add request body model for method request. Optional?!

  request_templates = {
    "application/json" = <<EOF
    {
      "body": $input.json('$'),
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      },
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      }
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "skill_name_patch_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_patch.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }

  response_templates = {
    "application/json" = <<EOT
    #set($rawBody = $input.json('$.body'))
    #set($parsedBody = $util.parseJson($rawBody))
    #set($status = $input.json('$.statusCode'))
    #if($status == 400)
        #set($context.responseOverride.status = 400)
    #end
    #if($status == 401)
        #set($context.responseOverride.status = 401)
    #end
    #if($status == 403)
        #set($context.responseOverride.status = 403)
    #end
    #if($status == 404)
        #set($context.responseOverride.status = 404)
    #end
    #if($status == 409)
        #set($context.responseOverride.status = 409)
    #end
    #if($status == 500)
        #set($context.responseOverride.status = 500)
    #end
    $parsedBody
    EOT
  }

  selection_pattern = ".*"
}

resource "aws_api_gateway_method" "skill_name_options" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = "OPTIONS"
  // Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_integration" "skill_name_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_options.http_method
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

resource "aws_api_gateway_integration_response" "skill_name_options_integration_response" {
  depends_on = [aws_api_gateway_integration.skill_name_options_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
  http_method = aws_api_gateway_method.skill_name_options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET,PATCH'"
  }
}

resource "aws_api_gateway_method_response" "skill_name_options_method_response" {
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

// TODO remove whole section after testing (not needed anymore)
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
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.tenant_id.id
  http_method = "OPTIONS"
  // Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_integration" "tenant_id_options_integration" {
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
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,RefreshToken'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
  }
}

resource "aws_api_gateway_method_response" "tenant_id_options_method_response" {
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

// TODO there is a new stage deployment with each CircleCI run -> fix this
resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_method.characters_get,
    aws_api_gateway_method_response.characters_get_method_response,
    aws_api_gateway_integration.characters_get_integration,
    aws_api_gateway_integration_response.characters_get_integration_response,
    aws_api_gateway_method.character_id_get,
    aws_api_gateway_method_response.character_id_get_method_response,
    aws_api_gateway_integration.character_id_get_integration,
    aws_api_gateway_integration_response.character_id_get_integration_response,
    aws_api_gateway_method.skill_name_get,
    aws_api_gateway_method_response.skill_name_get_method_response,
    aws_api_gateway_integration.skill_name_get_integration,
    aws_api_gateway_integration_response.skill_name_get_integration_response,
    aws_api_gateway_method.skill_name_patch,
    aws_api_gateway_method_response.skill_name_patch_method_response,
    aws_api_gateway_integration.skill_name_patch_integration,
    aws_api_gateway_integration_response.skill_name_patch_integration_response,
    aws_api_gateway_integration.tenant_id_post_integration,
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