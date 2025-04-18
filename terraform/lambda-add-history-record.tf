data "archive_file" "add_history_record" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambdas/add-history-record"
  output_path = "../backend/dist/add-history-record.zip"
}

// TODO add step function for increase-skill-lambda -> add-history-record lambda workflow
resource "aws_lambda_function" "add_history_record_lambda" {
  function_name = "pnp-add-history-record"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/add-history-record.zip"
  source_code_hash = data.archive_file.add_history_record.output_base64sha256
  layers           = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
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

resource "aws_lambda_permission" "add_history_record_invoke_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.add_history_record_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
