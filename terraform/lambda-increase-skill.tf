data "archive_file" "increase_skill" {
  type        = "zip"
  source_dir  = "../backend/build/lambdas/increase-skill"
  output_path = "../backend/dist/increase-skill.zip"
}

resource "aws_lambda_function" "increase_skill_lambda" {
  function_name = "pnp-increase-skill"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/increase-skill.zip"
  source_code_hash = data.archive_file.increase_skill.output_base64sha256
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

resource "aws_lambda_permission" "increase_skill_invoke_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.increase_skill_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
