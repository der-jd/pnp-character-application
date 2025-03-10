data "aws_region" "current" {}

resource "aws_iam_role" "control_plane_lambda_exec_role" {
  name = "lambda-execution-role-control-plane"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "control_plane_lambda_policy" {
  role = aws_iam_role.control_plane_lambda_exec_role.name
  name = "lambda-control-plane-policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "cognito-idp:CreateGroup",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:InitiateAuth"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "control_plane_lambda_policy_attachment" {
  role       = aws_iam_role.control_plane_lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "create-tenant-id" {
  type        = "zip"
  source_dir  = "../backend/build/lambdas/create-tenant-id"
  output_path = "../backend/dist/create-tenant-id.zip"
}

resource "aws_lambda_function" "create_tenant_id_lambda" {
  function_name = "pnp-create-tenant-id"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.control_plane_lambda_exec_role.arn

  environment {
    variables = {
      USER_POOL_ID = aws_cognito_user_pool.pnp_user_pool.id
      CLIENT_ID    = aws_cognito_user_pool_client.pnp_user_pool_client.id
      DOMAIN       = "https://${aws_cognito_user_pool.pnp_user_pool.id}.auth.${data.aws_region.current.name}.amazoncognito.com"
    }
  }

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