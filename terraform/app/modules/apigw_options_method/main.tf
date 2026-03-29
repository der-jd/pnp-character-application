variable "rest_api_id" {
  type = string
}
variable "resource_id" {
  type = string
}
variable "cors_allowed_origins" {
  type = list(string)
}
variable "integration_response_parameters" {
  type = map(string)
  default = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,GET,PATCH,POST,DELETE'"
    "method.response.header.Access-Control-Max-Age"       = "'600'"
    "method.response.header.Vary"                         = "'Origin'"
  }
}

resource "aws_api_gateway_method" "options" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = "OPTIONS"
  # Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_method_response" "options" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "true"
    "method.response.header.Access-Control-Allow-Methods" = "true"
    "method.response.header.Access-Control-Allow-Origin"  = "true"
    "method.response.header.Access-Control-Max-Age"       = "true"
    "method.response.header.Vary"                         = "true"
  }
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id          = var.rest_api_id
  resource_id          = var.resource_id
  http_method          = aws_api_gateway_method.options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_TEMPLATES"
  # see https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html#how-to-mock-integration-request-examples
  # For a method with the mock integration to return a 200 response, configure the
  # integration request body mapping template to return the following:
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

resource "aws_api_gateway_integration_response" "options" {
  depends_on = [aws_api_gateway_integration.options, aws_api_gateway_method_response.options]

  rest_api_id         = var.rest_api_id
  resource_id         = var.resource_id
  http_method         = aws_api_gateway_method.options.http_method
  status_code         = 200
  response_parameters = var.integration_response_parameters
  response_templates = {
    "application/json" = <<EOT
    #set($origin = $input.params("Origin"))
    #if(!$origin)
        #set($origin = $input.params("origin"))
    #end
    #set($allowedOrigins = $util.parseJson('${jsonencode(var.cors_allowed_origins)}'))
    #if($origin && $allowedOrigins.contains($origin))
        #set($context.responseOverride.header.Access-Control-Allow-Origin = $origin)
    #end
    {}
    EOT
  }
}
