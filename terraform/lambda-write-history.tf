data "archive_file" "write_history" {
  type        = "zip"
  source_dir  = "../backend/build/lambdas/write-history"
  output_path = "../backend/dist/write-history.zip"
}

resource "aws_lambda_function" "write_history_lambda" {
  function_name = "pnp-write-history"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/write-history.zip"
  source_code_hash = data.archive_file.write_history.output_base64sha256
  layers           = [aws_lambda_layer_version.configuration.arn]
  environment {
    variables = {
      TABLE_NAME = local.history_table_name
    }
  }
  logging_config {
    log_format            = "JSON"
    application_log_level = "INFO"
    system_log_level      = "INFO"
  }
}

resource "aws_lambda_permission" "write_history_invoke_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.write_history_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
