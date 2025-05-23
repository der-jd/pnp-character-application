variable "rest_api_id" {}
variable "resource_id" {}
variable "allowed_origin" {
  type    = string
  default = "'*'" // TODO delete after testing and implement the following line
  //default = "'https://${aws_cloudfront_distribution.frontend_distribution.domain_name}'"
}
variable "allowed_headers" {
  type    = string
  default = "'Content-Type,Authorization'"
}
variable "allowed_methods" {
  type    = string
  default = "'OPTIONS,GET,PATCH'"
}

resource "aws_api_gateway_method" "options" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = "OPTIONS"
  // Authorization needs to be NONE for the preflight request to work which is sent automatically by the browser without any authorization header.
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Origin" : false
  }
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id          = var.rest_api_id
  resource_id          = var.resource_id
  http_method          = aws_api_gateway_method.options.http_method
  type                 = "MOCK"
  passthrough_behavior = "WHEN_NO_TEMPLATES"
  // see https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html#how-to-mock-integration-request-examples
  // For a method with the mock integration to return a 200 response, configure the
  // integration request body mapping template to return the following:
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

resource "aws_api_gateway_integration_response" "options" {
  depends_on = [aws_api_gateway_integration.options, aws_api_gateway_method_response.options]

  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.options.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = var.allowed_origin
    "method.response.header.Access-Control-Allow-Headers" = var.allowed_headers
    "method.response.header.Access-Control-Allow-Methods" = var.allowed_methods
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
  }
}
