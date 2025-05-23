variable "status_codes" {
  type    = list(string)
  default = ["400", "401", "403", "404", "409", "500", "200"]
}

resource "aws_iam_role" "api_gateway_role" {
  name = "api-gateway-step-function-role"

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
    Statement = [
      {
        Effect = "Allow",
        Action = "states:StartSyncExecution",
        Resource = [
          aws_sfn_state_machine.increase_skill_state_machine.arn,
          aws_sfn_state_machine.increase_attribute_state_machine.arn
        ]
      }
    ]
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

// ================== /characters ==================

resource "aws_api_gateway_resource" "characters" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_rest_api.pnp_rest_api.root_resource_id
  path_part   = "characters" // .../characters
}

// ================== GET /characters ==================

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
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.querystring.character-short" = "method.request.querystring.character-short"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      ## Headers are always available
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      }

      ## Include pathParameters if available
      #if($input.params().path.keySet().size() > 0)
      , ## Add a comma for the following block
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include querystring if available
      #if($input.params().querystring.keySet().size() > 0)
      , ## Add a comma for the following block
      "queryStringParameters": {
        #foreach($param in $input.params().querystring.keySet())
        "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include body if available
      #if($input.body != {})
      , ## Add a comma for the following block
      "body": $input.json('$')
      #end
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
    ## --- Handle error case ---
    #set($errorJson = $input.path('$.errorMessage'))
    #if($errorJson != "")
        #set($errorJsonObject = $util.parseJson($errorJson))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $errorJson
    ## --- Handle success case ---
    #else
        #set($context.responseOverride.status = $input.path('$.statusCode'))
        $input.path('$.body')
    #end
    EOT
  }

  selection_pattern = ".*"
}

// ================== OPTIONS /characters ==================

module "characters_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.characters.id
}

// ================== /characters/{character-id} ==================

resource "aws_api_gateway_resource" "character_id" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.characters.id
  path_part   = "{character-id}" // .../characters/{character-id}
}

// ================== GET /characters/{character-id} ==================

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
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.path.character-id" = "method.request.path.character-id"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      ## Headers are always available
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      }

      ## Include pathParameters if available
      #if($input.params().path.keySet().size() > 0)
      , ## Add a comma for the following block
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include querystring if available
      #if($input.params().querystring.keySet().size() > 0)
      , ## Add a comma for the following block
      "queryStringParameters": {
        #foreach($param in $input.params().querystring.keySet())
        "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include body if available
      #if($input.body != {})
      , ## Add a comma for the following block
      "body": $input.json('$')
      #end
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "character_id_get_integration_response" {
  depends_on = [aws_api_gateway_integration.character_id_get_integration]

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
   */
  response_templates = {
    "application/json" = <<EOT
    ## --- Handle error case ---
    #set($errorJson = $input.path('$.errorMessage'))
    #if($errorJson != "")
        #set($errorJsonObject = $util.parseJson($errorJson))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $errorJson
    ## --- Handle success case ---
    #else
        #set($context.responseOverride.status = $input.path('$.statusCode'))
        $input.path('$.body')
    #end
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

// ================== OPTIONS /characters/{character-id} ==================

module "character_id_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.character_id.id
}

// ================== /characters/{character-id}/attributes ==================

resource "aws_api_gateway_resource" "attributes" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "attributes" // .../characters/{character-id}/attributes
}

// ================== /characters/{character-id}/attributes/{attribute-name} ==================

resource "aws_api_gateway_resource" "attribute_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.attributes.id
  path_part   = "{attribute-name}" // .../characters/{character-id}/attributes/{attribute-name}
}

// ================== PATCH /characters/{character-id}/attributes/{attribute-name} ==================

resource "aws_api_gateway_method" "attribute_name_patch" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.attribute_name.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  request_parameters = {
    "method.request.path.character-id"   = true
    "method.request.path.attribute-name" = true
  }
}

resource "aws_api_gateway_method_response" "attribute_name_patch_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.attribute_name.id
  http_method = aws_api_gateway_method.attribute_name_patch.http_method
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


resource "aws_api_gateway_integration" "attribute_name_patch_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.attribute_name.id
  http_method             = aws_api_gateway_method.attribute_name_patch.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:states:action/StartSyncExecution"
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  credentials             = aws_iam_role.api_gateway_role.arn
  request_parameters = {
    "integration.request.path.character-id"   = "method.request.path.character-id"
    "integration.request.path.attribute-name" = "method.request.path.attribute-name"
  }
  // TODO add request body model for method request. Optional?!

  request_templates = {
    "application/json" = <<EOF
    ## Template taken from https://github.com/aws/aws-cdk/blob/v1-main/packages/@aws-cdk/aws-apigateway/lib/integrations/stepfunctions.vtl
    ## and adapted slightly.
    ##
    ## This template forwards the request header, path, query string and body if available
    ## to the execution input of the state machine.
    ##
    ## "@@" is used here as a placeholder for '"' to avoid using escape characters.

    #set($inputString = '')
    #set($allParams = $input.params())

    ## Include header if available
    #if($allParams.header && $allParams.header.keySet().size() > 0)
      #set($inputString = "$inputString, @@headers@@: {")
      #foreach($paramName in $allParams.header.keySet())
        #set($inputString = "$inputString @@$paramName@@: @@$util.escapeJavaScript($allParams.header.get($paramName))@@")
        #if($foreach.hasNext)
          #set($inputString = "$inputString,")
        #end
      #end
      #set($inputString = "$inputString }")
    #end

    ## Include path if available
    #if($allParams.path && $allParams.path.keySet().size() > 0)
      #set($inputString = "$inputString, @@pathParameters@@: {")
      #foreach($paramName in $allParams.path.keySet())
        #set($inputString = "$inputString @@$paramName@@: @@$util.escapeJavaScript($allParams.path.get($paramName))@@")
        #if($foreach.hasNext)
          #set($inputString = "$inputString,")
        #end
      #end
      #set($inputString = "$inputString }")
    #end

    ## Include query string if available
    #if($allParams.querystring && $allParams.querystring.keySet().size() > 0)
      #set($inputString = "$inputString, @@queryStringParameters@@: {")
      #foreach($paramName in $allParams.querystring.keySet())
        #set($inputString = "$inputString @@$paramName@@: @@$util.escapeJavaScript($allParams.querystring.get($paramName))@@")
        #if($foreach.hasNext)
          #set($inputString = "$inputString,")
        #end
      #end
      #set($inputString = "$inputString }")
    #end

    ## Include body if available
    #if($input.body != {})
      #set($inputString = "$inputString, @@body@@: $input.body")
    #end

    #set($inputString = $inputString.replaceAll("@@", '"'))

    {
      "input": "{$util.escapeJavaScript($inputString.substring(1, $inputString.length()))}", ## Remove the leading comma
      "name": "$context.requestId",
      "stateMachineArn": "${aws_sfn_state_machine.increase_attribute_state_machine.arn}"
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "attribute_name_patch_integration_response" {
  depends_on = [aws_api_gateway_integration.attribute_name_patch_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.attribute_name.id
  http_method = aws_api_gateway_method.attribute_name_patch.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }

  response_templates = {
    "application/json" = <<EOT
    ## --- Handle error case for step function ---
    #set($output = $util.parseJson($input.path('$.output')))
    #if($output.errorMessage != "")
        #set($errorJsonObject = $util.parseJson($output.errorMessage))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $output.errorMessage
    ## --- Handle success case for step function ---
    #else
        #set($context.responseOverride.status = $output.statusCode)
        $output.body
    #end
    EOT
  }

  selection_pattern = ".*"
}

// ================== OPTIONS /characters/{character-id}/attributes/{attribute-name} ==================

module "attribute_name_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.attribute_name.id
}

// ================== /characters/{character-id}/skills ==================

resource "aws_api_gateway_resource" "skills" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "skills" // .../characters/{character-id}/skills
}

// ================== /characters/{character-id}/skills/{skill-category} ==================

resource "aws_api_gateway_resource" "skill_category" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.skills.id
  path_part   = "{skill-category}" // .../characters/{character-id}/skills/{skill-category}
}

// ================== /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

resource "aws_api_gateway_resource" "skill_name" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.skill_category.id
  path_part   = "{skill-name}" // .../characters/{character-id}/skills/{skill-category}/{skill-name}
}

// ================== GET /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

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
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.path.character-id"           = "method.request.path.character-id"
    "integration.request.path.skill-category"         = "method.request.path.skill-category"
    "integration.request.path.skill-name"             = "method.request.path.skill-name"
    "integration.request.querystring.learning-method" = "method.request.querystring.learning-method"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      ## Headers are always available
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      }

      ## Include pathParameters if available
      #if($input.params().path.keySet().size() > 0)
      , ## Add a comma for the following block
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include querystring if available
      #if($input.params().querystring.keySet().size() > 0)
      , ## Add a comma for the following block
      "queryStringParameters": {
        #foreach($param in $input.params().querystring.keySet())
        "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include body if available
      #if($input.body != {})
      , ## Add a comma for the following block
      "body": $input.json('$')
      #end
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
    ## --- Handle error case ---
    #set($errorJson = $input.path('$.errorMessage'))
    #if($errorJson != "")
        #set($errorJsonObject = $util.parseJson($errorJson))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $errorJson
    ## --- Handle success case ---
    #else
        #set($context.responseOverride.status = $input.path('$.statusCode'))
        $input.path('$.body')
    #end
    EOT
  }

  selection_pattern = ".*"
}

// ================== PATCH /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

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
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:states:action/StartSyncExecution"
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  credentials             = aws_iam_role.api_gateway_role.arn
  request_parameters = {
    "integration.request.path.character-id"   = "method.request.path.character-id"
    "integration.request.path.skill-category" = "method.request.path.skill-category"
    "integration.request.path.skill-name"     = "method.request.path.skill-name"
  }
  // TODO add request body model for method request. Optional?!

  request_templates = {
    "application/json" = <<EOF
    ## Template taken from https://github.com/aws/aws-cdk/blob/v1-main/packages/@aws-cdk/aws-apigateway/lib/integrations/stepfunctions.vtl
    ## and adapted slightly.
    ##
    ## This template forwards the request header, path, query string and body if available
    ## to the execution input of the state machine.
    ##
    ## "@@" is used here as a placeholder for '"' to avoid using escape characters.

    #set($inputString = '')
    #set($allParams = $input.params())

    ## Include header if available
    #if($allParams.header && $allParams.header.keySet().size() > 0)
      #set($inputString = "$inputString, @@headers@@: {")
      #foreach($paramName in $allParams.header.keySet())
        #set($inputString = "$inputString @@$paramName@@: @@$util.escapeJavaScript($allParams.header.get($paramName))@@")
        #if($foreach.hasNext)
          #set($inputString = "$inputString,")
        #end
      #end
      #set($inputString = "$inputString }")
    #end

    ## Include path if available
    #if($allParams.path && $allParams.path.keySet().size() > 0)
      #set($inputString = "$inputString, @@pathParameters@@: {")
      #foreach($paramName in $allParams.path.keySet())
        #set($inputString = "$inputString @@$paramName@@: @@$util.escapeJavaScript($allParams.path.get($paramName))@@")
        #if($foreach.hasNext)
          #set($inputString = "$inputString,")
        #end
      #end
      #set($inputString = "$inputString }")
    #end

    ## Include query string if available
    #if($allParams.querystring && $allParams.querystring.keySet().size() > 0)
      #set($inputString = "$inputString, @@queryStringParameters@@: {")
      #foreach($paramName in $allParams.querystring.keySet())
        #set($inputString = "$inputString @@$paramName@@: @@$util.escapeJavaScript($allParams.querystring.get($paramName))@@")
        #if($foreach.hasNext)
          #set($inputString = "$inputString,")
        #end
      #end
      #set($inputString = "$inputString }")
    #end

    ## Include body if available
    #if($input.body != {})
      #set($inputString = "$inputString, @@body@@: $input.body")
    #end

    #set($inputString = $inputString.replaceAll("@@", '"'))

    {
      "input": "{$util.escapeJavaScript($inputString.substring(1, $inputString.length()))}", ## Remove the leading comma
      "name": "$context.requestId",
      "stateMachineArn": "${aws_sfn_state_machine.increase_skill_state_machine.arn}"
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "skill_name_patch_integration_response" {
  depends_on = [aws_api_gateway_integration.skill_name_patch_integration]

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
    ## --- Handle error case for step function ---
    #set($output = $util.parseJson($input.path('$.output')))
    #if($output.errorMessage != "")
        #set($errorJsonObject = $util.parseJson($output.errorMessage))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $output.errorMessage
    ## --- Handle success case for step function ---
    #else
        #set($context.responseOverride.status = $output.statusCode)
        $output.body
    #end
    EOT
  }

  selection_pattern = ".*"
}

// ================== OPTIONS /characters/{character-id}/skills/{skill-category}/{skill-name} ==================

module "skill_name_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.skill_name.id
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
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
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
  rest_api_id          = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id          = aws_api_gateway_resource.tenant_id.id
  http_method          = aws_api_gateway_method.tenant_id_options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_TEMPLATES"
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

// ================== /characters/{character-id}/history ==================

resource "aws_api_gateway_resource" "history" {
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  parent_id   = aws_api_gateway_resource.character_id.id
  path_part   = "history" // .../history
}

// ================== GET /characters/{character-id}/history ==================

resource "aws_api_gateway_method" "history_get" {
  rest_api_id   = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_authorizer.id
  request_parameters = {
    "method.request.querystring.block-number" = true
  }
}

resource "aws_api_gateway_method_response" "history_get_method_response" {
  for_each = toset(var.status_codes)

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_get.http_method
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

resource "aws_api_gateway_integration" "history_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id             = aws_api_gateway_resource.history.id
  http_method             = aws_api_gateway_method.history_get.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = aws_lambda_function.get_history_lambda.invoke_arn
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters = {
    "integration.request.querystring.block-number" = "method.request.querystring.block-number"
  }

  request_templates = {
    "application/json" = <<EOF
    {
      ## Headers are always available
      "headers": {
        #foreach($param in $input.params().header.keySet())
        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
        #if($foreach.hasNext),#end
        #end
      }

      ## Include pathParameters if available
      #if($input.params().path.keySet().size() > 0)
      , ## Add a comma for the following block
      "pathParameters": {
        #foreach($param in $input.params().path.keySet())
        "$param": "$util.escapeJavaScript($input.params().path.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include querystring if available
      #if($input.params().querystring.keySet().size() > 0)
      , ## Add a comma for the following block
      "queryStringParameters": {
        #foreach($param in $input.params().querystring.keySet())
        "$param": "$util.escapeJavaScript($input.params().querystring.get($param))"
        #if($foreach.hasNext),#end
        #end
      }#end

      ## Include body if available
      #if($input.body != {})
      , ## Add a comma for the following block
      "body": $input.json('$')
      #end
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "history_get_integration_response" {
  depends_on = [aws_api_gateway_integration.history_get_integration]

  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_get.http_method
  status_code = 200

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET'"
  }

  response_templates = {
    "application/json" = <<EOT
    ## --- Handle error case ---
    #set($errorJson = $input.path('$.errorMessage'))
    #if($errorJson != "")
        #set($errorJsonObject = $util.parseJson($errorJson))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $errorJson
    ## --- Handle success case ---
    #else
        #set($context.responseOverride.status = $input.path('$.statusCode'))
        $input.path('$.body')
    #end
    EOT
  }

  selection_pattern = ".*"
}

// ================== OPTIONS /characters/{character-id}/history ==================

module "history_options" {
  source      = "./modules/apigw_options_method"
  rest_api_id = aws_api_gateway_rest_api.pnp_rest_api.id
  resource_id = aws_api_gateway_resource.history.id
}
