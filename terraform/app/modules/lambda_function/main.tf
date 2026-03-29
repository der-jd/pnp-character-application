variable "source_name" {
  type        = string
  description = "Lambda folder name under backend/src/lambdas/ and backend/build/src/lambdas/."
}

variable "function_name" {
  type        = string
  description = "Full Lambda function name in AWS."
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs24.x"
}

variable "environment_vars" {
  type = map(string)
}

variable "layers" {
  type    = list(string)
  default = []
}

variable "role_arn" {
  type = string
}

variable "api_gateway_arn" {
  type = string
}

variable "timeout" {
  type    = number
  default = 5
}

locals {
  lambda_build_dir     = abspath("${path.root}/../../backend/build/src/lambdas/${var.source_name}")
  lambda_zip_path      = abspath("${path.root}/../../backend/dist/${var.function_name}.zip")
  placeholder_zip_path = abspath("${path.root}/../../backend/dist/${var.function_name}-placeholder.zip")
  source_dir_files     = try(fileset(local.lambda_build_dir, "**"), [])
  build_dir_has_files  = length(local.source_dir_files) > 0
  source_code_hash = (local.build_dir_has_files
    ? data.archive_file.lambda_zip[0].output_base64sha256
    : data.archive_file.placeholder_zip[0].output_base64sha256
  )
}

# When the backend build output exists, zip it for deployment.
# When it doesn't (e.g. during terraform destroy in the CI/CD pipeline where the backend isn't built),
# create a placeholder zip so the aws_lambda_function resource remains valid.
# The placeholder content is irrelevant since the resource is being destroyed.
data "archive_file" "lambda_zip" {
  count       = local.build_dir_has_files ? 1 : 0
  type        = "zip"
  source_dir  = local.lambda_build_dir
  output_path = local.lambda_zip_path
}

data "archive_file" "placeholder_zip" {
  count                   = local.build_dir_has_files ? 0 : 1
  type                    = "zip"
  source_content          = "placeholder"
  source_content_filename = "index.js"
  output_path             = local.placeholder_zip_path
}

resource "aws_lambda_function" "lambda_function" {
  function_name    = var.function_name
  handler          = var.handler
  runtime          = var.runtime
  role             = var.role_arn
  filename         = local.build_dir_has_files ? local.lambda_zip_path : local.placeholder_zip_path
  source_code_hash = local.source_code_hash
  layers           = var.layers
  timeout          = var.timeout

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
