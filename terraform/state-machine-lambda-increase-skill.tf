data "archive_file" "increase_skill" {
  type        = "zip"
  source_dir  = "../backend/build/src/lambdas/increase-skill"
  output_path = "../backend/dist/increase-skill.zip"
}

resource "aws_lambda_function" "increase_skill_lambda" {
  function_name = "pnp-increase-skill"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn

  filename         = "../backend/dist/increase-skill.zip"
  source_code_hash = data.archive_file.increase_skill.output_base64sha256
  layers           = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
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

resource "aws_iam_role" "step_function_role" {
  name = "step-function-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "states.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "step_function_lambda_execution_policy" {
  role       = aws_iam_role.step_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "step_function_lambda_role_policy" {
  role       = aws_iam_role.step_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaRole"
}

resource "aws_cloudwatch_log_group" "increase_skill_state_machine_log_group" {
  name              = "/aws/states/increase-skill"
  retention_in_days = 0
}

resource "aws_cloudwatch_log_resource_policy" "step_function_logging" {
  policy_name = "AllowStepFunctionsLogging"
  policy_document = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        },
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "${aws_cloudwatch_log_group.increase_skill_state_machine_log_group.arn}:*",
        Condition = {
          ArnLike = {
            "aws:SourceArn" : "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
          }
        }
      }
    ]
  })
}


resource "aws_sfn_state_machine" "increase_skill_state_machine" {
  name     = "increase-skill"
  role_arn = aws_iam_role.step_function_role.arn
  type     = "EXPRESS"
  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.increase_skill_state_machine_log_group.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  definition = jsonencode({
    StartAt = "IncreaseSkill",
    States = {
      IncreaseSkill = {
        Type       = "Task",
        Resource   = aws_lambda_function.increase_skill_lambda.arn,
        ResultPath = "$.IncreaseSkillResult",
        Next       = "AddHistoryRecord"
      },
      AddHistoryRecord = {
        Type       = "Task",
        Resource   = aws_lambda_function.add_history_record_lambda.arn,
        ResultPath = "$.AddHistoryRecordResult",
        End        = true
      }
    }
  })
}

