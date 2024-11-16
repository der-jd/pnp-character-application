resource "aws_lambda_function" "increase_skill_lambda" {
  function_name = "pnp-increase-skill"
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  role     = aws_iam_role.lambda_exec_role.arn
   // TODO code changes are not automatically applied with terraform apply --> use zip file name based on hash of file content.
   // DO NOT user git hash as this would reupload lambda code even if just the readme has been changed
   // Use archive_file instead?!:
   // - https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
   // - https://stackoverflow.com/questions/48577727/how-to-trigger-terraform-to-upload-new-lambda-code
  filename = "../backend/dist/increase-skill.zip"
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
