data "archive_file" "configuration" {
  type        = "zip"
  source_dir  = "../backend/build/lambda-layers/configuration"
  output_path = "../backend/dist/configuration.zip"
}

resource "aws_lambda_layer_version" "configuration" {
  layer_name          = "configuration"
  filename            = "../backend/dist/configuration.zip"
  source_code_hash    = data.archive_file.configuration.output_base64sha256
  compatible_runtimes = ["nodejs20.x"]
}

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
}

resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_permission" "api_gateway_invoke_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.increase_skill_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pnp_rest_api.execution_arn}/*/*"
}
