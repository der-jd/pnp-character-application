data "archive_file" "create-tenant-id" {
  type        = "zip"
  source_dir  = "../backend/build/lambdas/create-tenant-id"
  output_path = "../backend/dist/create-tenant-id.zip"
}

resource "aws_lambda_function" "create_tenant_id_lambda" {
  function_name = "pnp-create-tenant-id"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/create-tenant-id.zip"
  source_code_hash = data.archive_file.create-tenant-id.output_base64sha256
  layers           = [aws_lambda_layer_version.configuration.arn]
  logging_config {
    log_format            = "JSON"
    application_log_level = "INFO"
    system_log_level      = "INFO"
  }
}

resource "aws_lambda_permission" "create_tenant_id_lambda_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_tenant_id_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
