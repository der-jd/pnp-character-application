data "archive_file" "get_history" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambdas/get-history"
  output_path = "../backend/dist/get-history.zip"
}

resource "aws_lambda_function" "get_history_lambda" {
  function_name = "pnp-get-history"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/get-history.zip"
  source_code_hash = data.archive_file.get_history.output_base64sha256
  layers           = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  environment {
    variables = {
      TABLE_NAME_HISTORY = local.history_table_name
    }
  }
  logging_config {
    log_format            = "JSON"
    application_log_level = "INFO"
    system_log_level      = "INFO"
  }
}

resource "aws_lambda_permission" "get_history_invoke_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_history_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
