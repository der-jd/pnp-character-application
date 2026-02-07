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
  type    = map(bool)
  default = {}
}
variable "status_codes" {
  type    = list(string)
  default = ["200", "400", "401", "403", "404", "409", "500"]
}
variable "aws_region" {
  type = string
}
variable "credentials" {
  type = string
}
variable "state_machine_arn" {
  type = string
}
variable "integration_response_parameters" {
  type = map(string)
  default = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'" // TODO delete after testing and comment in following line
    //"method.response.header.Access-Control-Allow-Origin"  = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET,PATCH,POST,DELETE'"
    "method.response.header.Access-Control-Max-Age"       = "'86400'" // Cache preflight for 24 hours
  }
}

resource "aws_api_gateway_method" "step_function" {
  rest_api_id        = var.rest_api_id
  resource_id        = var.resource_id
  http_method        = var.http_method
  authorization      = "COGNITO_USER_POOLS"
  authorizer_id      = var.authorizer_id
  request_parameters = var.method_request_parameters
}

resource "aws_api_gateway_method_response" "step_function" {
  for_each = toset(var.status_codes)

  rest_api_id     = var.rest_api_id
  resource_id     = var.resource_id
  http_method     = aws_api_gateway_method.step_function.http_method
  status_code     = each.value
  response_models = { "application/json" = "Empty" }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Max-Age"       = true
  }
}

resource "aws_api_gateway_integration" "step_function" {
  rest_api_id             = var.rest_api_id
  resource_id             = var.resource_id
  http_method             = aws_api_gateway_method.step_function.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:${var.aws_region}:states:action/StartSyncExecution"
  passthrough_behavior    = "WHEN_NO_TEMPLATES"
  credentials             = var.credentials
  request_parameters      = { for k, v in var.method_request_parameters : "integration.request.${replace(k, "method.request.", "")}" => k }
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
      "stateMachineArn": "${var.state_machine_arn}"
    }
    EOF
  }
}

resource "aws_api_gateway_integration_response" "step_function" {
  depends_on = [aws_api_gateway_integration.step_function, aws_api_gateway_method_response.step_function]

  rest_api_id         = var.rest_api_id
  resource_id         = var.resource_id
  http_method         = aws_api_gateway_method.step_function.http_method
  status_code         = 200
  response_parameters = var.integration_response_parameters
  response_templates = {
    "application/json" = <<EOT
    #set($errorJson = $input.path('$.output.errorMessage'))
    #if($errorJson != "")
        #set($errorJsonObject = $util.parseJson($errorJson))
        #set($context.responseOverride.status = $errorJsonObject.statusCode)
        $errorJson
    #else
        #set($context.responseOverride.status = $input.path('$.output.statusCode'))
        $input.path('$.output.body')
    #end
    EOT
  }
  selection_pattern = ".*"
}
