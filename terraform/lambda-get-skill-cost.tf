data "archive_file" "get_skill_cost" {
  type        = "zip"
  source_dir  = "../backend/build/lambdas/get-skill-cost"
  output_path = "../backend/dist/get-skill-cost.zip"
}

resource "aws_lambda_function" "get_skill_cost_lambda" {
  function_name = "pnp-get-skill-cost"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/get-skill-cost.zip"
  source_code_hash = data.archive_file.get_skill_cost.output_base64sha256
  layers           = [aws_lambda_layer_version.configuration.arn]
  environment {
    variables = {
      TABLE_NAME = local.characters_table_name
    }
  }
  logging_config {
    log_format            = "JSON"
    application_log_level = "INFO"
    system_log_level      = "INFO"
  }
}

resource "aws_lambda_permission" "get_skill_cost_invoke_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_skill_cost_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
