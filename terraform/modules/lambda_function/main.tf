variable "function_name" { // Must match the directory name in ../backend/src/lambdas/
  type = string
}
variable "handler" {
  type    = string
  default = "index.handler"
}
variable "runtime" {
  type    = string
  default = "nodejs20.x" // TODO change to nodejs22.x when available
}
variable "environment_vars" {
  type = map(string)
}
variable "layers" {
  type = list(string)
}
variable "role_arn" {
  type = string
}
variable "api_gateway_arn" {
  type = string
}

locals {
  lambda_zip_path = "../backend/dist/${var.function_name}.zip"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambdas/${var.function_name}"
  output_path = local.lambda_zip_path
}

resource "aws_lambda_function" "lambda_function" {
  function_name    = "pnp-${var.function_name}"
  handler          = var.handler
  runtime          = var.runtime
  role             = var.role_arn
  filename         = local.lambda_zip_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  layers           = var.layers
  environment {
    variables = var.environment_vars
  }
  logging_config {
    log_format            = "JSON"
    application_log_level = "INFO"
    system_log_level      = "INFO"
  }
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_arn}/*/*"
}
