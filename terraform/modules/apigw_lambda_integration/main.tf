variable "rest_api_id" {
  type = string
}
variable "resource_id" {
  type = string
}
variable "http_method" {
  type = string
}
variable "authorizer_id" {
  type = string
}
variable "method_request_parameters" {
  type = map(bool)
}
variable "status_codes" {
  type    = list(string)
  default = ["200", "400", "401", "403", "404", "409", "500"]
}
variable "lambda_uri" {
  type = string
}
variable "integration_response_parameters" {
  type = map(string)
  default = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET,PATCH,POST,DELETE'"
  }
}

resource "aws_api_gateway_method" "lambda" {
  rest_api_id        = var.rest_api_id
  resource_id        = var.resource_id
  http_method        = var.http_method
  authorization      = "COGNITO_USER_POOLS"
  authorizer_id      = var.authorizer_id
  request_parameters = var.method_request_parameters
}

resource "aws_api_gateway_method_response" "lambda" {
  for_each = toset(var.status_codes)

  rest_api_id     = var.rest_api_id
  resource_id     = var.resource_id
  http_method     = aws_api_gateway_method.lambda.http_method
  status_code     = each.value
  response_models = { "application/json" = "Empty" }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = var.rest_api_id
  resource_id             = var.resource_id
  http_method             = aws_api_gateway_method.lambda.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = var.lambda_uri
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  request_parameters      = { for k, v in var.method_request_parameters : "integration.request.${replace(k, "method.request.", "")}" => k }
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

resource "aws_api_gateway_integration_response" "lambda" {
  depends_on = [aws_api_gateway_integration.lambda, aws_api_gateway_method_response.lambda]

  rest_api_id         = var.rest_api_id
  resource_id         = var.resource_id
  http_method         = aws_api_gateway_method.lambda.http_method
  status_code         = 200
  response_parameters = var.integration_response_parameters
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
        ## Parse the stringified JSON body before returning
        #set($bodyJson = $util.parseJson($input.path('$.body')))
        $util.toJson($bodyJson)
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
