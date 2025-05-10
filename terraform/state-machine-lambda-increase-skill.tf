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
      TABLE_NAME_CHARACTERS = local.characters_table_name
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

/**
 * Logging to CloudWatch Logs for Step Functions Express workflows requires special permissions and
 * a resource based policy for the log group. See:
 * https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html#cloudwatch-iam-policy
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html#AWS-vended-logs-permissions
 */
resource "aws_iam_role_policy_attachment" "step_function_cloudwatch_policy" {
  role       = aws_iam_role.step_function_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

resource "aws_cloudwatch_log_group" "increase_skill_state_machine_log_group" {
  name              = "/aws/vendedlogs/states/increase-skill"
  retention_in_days = 0
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

  // Examples for error handling: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html#error-handling-examples
  // Best practiceS: https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
  definition = jsonencode({
    StartAt = "IncreaseSkill",
    States = {
      IncreaseSkill = {
        QueryLanguage  = "JSONata",
        Type           = "Task",
        Resource       = aws_lambda_function.increase_skill_lambda.arn,
        TimeoutSeconds = 5 // Timeout to avoid waiting for a stuck task
        Retry = [
          {
            // Retry in case of Lambda service exceptions
            ErrorEquals = [
              "Lambda.ClientExecutionTimeoutException",
              "Lambda.ServiceException",
              "Lambda.AWSLambdaException",
              "Lambda.SdkClientException"
            ],
            IntervalSeconds = 1,
            MaxAttempts     = 4,
            BackoffRate     = 1.5, // Multiply the retry IntervalSeconds with this number after each retry -> exponential growth
            MaxDelaySeconds = 3    // Cap exponential retry interval
          },
          {
            ErrorEquals     = ["States.ALL"],
            IntervalSeconds = 1,
            MaxAttempts     = 2,
            BackoffRate     = 1,
          },
        ],
        Catch = [
          {
            ErrorEquals = ["States.ALL"], // Fail on all errors if retries not defined or exceeded
            Next        = "HandleError"
          }
        ],
        Next = "AddHistoryRecord"
      },
      /**
       * TODO add custom error response for add history record function
       * All errors in this function are internal ones and the user should not be
       * directly informed about the details.
       */
      AddHistoryRecord = {
        QueryLanguage = "JSONata",
        Type          = "Task",
        Resource      = aws_lambda_function.add_history_record_lambda.arn,
        Arguments = {
          "body" = {
            "userId"            = "{% $parse($states.input.body).userId %}",
            "type"              = "SKILL_RAISED",
            "name"              = "{% $parse($states.input.body).skillName %}",
            "data"              = "{% $parse($states.input.body).skill %}",
            "learningMethod"    = "{% $parse($states.input.body).learningMethod %}",
            "calculationPoints" = "{% $parse($states.input.body).adventurePoints %}"
          }
        },
        TimeoutSeconds = 5
        Retry = [
          {
            ErrorEquals = [
              "Lambda.ClientExecutionTimeoutException",
              "Lambda.ServiceException",
              "Lambda.AWSLambdaException",
              "Lambda.SdkClientException"
            ],
            IntervalSeconds = 1,
            MaxAttempts     = 4,
            BackoffRate     = 1.5,
            MaxDelaySeconds = 3
          },
          {
            ErrorEquals     = ["States.ALL"],
            IntervalSeconds = 1,
            MaxAttempts     = 2,
            BackoffRate     = 1,
          },
        ],
        Catch = [
          {
            ErrorEquals = ["States.ALL"], // Fail on all errors if retries not defined or exceeded
            Next        = "HandleError"
          }
        ],
        End = true
      },
      HandleError = {
        QueryLanguage = "JSONata",
        Type          = "Pass",
        Output = {
          "errorMessage" = "{% $parse($states.input.Cause).errorMessage %}"
        },
        End = true
      }
    }
  })
}

