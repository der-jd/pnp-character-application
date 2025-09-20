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

resource "aws_cloudwatch_log_group" "update_skill_state_machine_log_group" {
  name              = "/aws/vendedlogs/states/update-skill"
  retention_in_days = 0
}

resource "aws_sfn_state_machine" "update_skill_state_machine" {
  name     = "update-skill"
  role_arn = aws_iam_role.step_function_role.arn
  type     = "EXPRESS"
  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.update_skill_state_machine_log_group.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  // Examples for error handling: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html#error-handling-examples
  // Best practices: https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
  // Transforming input and output with JSONata: https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html
  definition = jsonencode({
    StartAt = "UpdateSkill",
    States = {
      UpdateSkill = {
        Type          = "Task",
        QueryLanguage = "JSONata",
        Resource      = module.update_skill_lambda.lambda_function.arn,
        Assign = {
          statusCode      = "{% $states.result.statusCode %}",
          updateSkillBody = "{% $states.result.body %}"
        },
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
        Next = "IsHistoryRecordNecessary"
      },
      IsHistoryRecordNecessary = {
        Type          = "Choice",
        QueryLanguage = "JSONata",
        Choices = [
          {
            // The skill was not updated, so no history record is necessary
            Condition = "{% $parse($states.input.body).changes.old = $parse($states.input.body).changes.new %}",
            Next      = "SuccessState"
          }
        ],
        Default = "AddHistoryRecord"
      },
      AddHistoryRecord = {
        Type          = "Task",
        QueryLanguage = "JSONata",
        Resource      = module.add_history_record_lambda.lambda_function.arn,
        Arguments = {
          "pathParameters" = {
            "character-id" = "{% $parse($states.input.body).characterId %}"
          },
          "body" = {
            "userId" = "{% $parse($states.input.body).userId %}",
            "type"   = "6", // SKILL_CHANGED
            // Skill name pattern: "skillCategory/skillName"
            // e.g. "knowledge/history"
            "name"           = "{% $parse($states.input.body).skillCategory & '/' & $parse($states.input.body).skillName %}",
            "data"           = "{% $parse($states.input.body).changes %}",
            "learningMethod" = "{% $parse($states.input.body).learningMethod ? $parse($states.input.body).learningMethod : null %}",
            "calculationPoints" = {
              "adventurePoints" = "{% $parse($states.input.body).adventurePoints %}",
              "attributePoints" = null
            },
            "comment" = null
          }
        },
        Assign = {
          addHistoryRecordBody = "{% $states.result.body %}"
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
        Next = "SuccessState"
      },
      HandleError = {
        Type          = "Pass",
        QueryLanguage = "JSONata",
        Output = {
          "errorMessage" = "{% $parse($states.input.Cause).errorMessage %}"
        },
        End = true
      },
      SuccessState = {
        Type          = "Succeed",
        QueryLanguage = "JSONata",
        Output = {
          "statusCode" = "{% $statusCode %}",
          /**
           * The content of "body" should be a stringified JSON to be consistent with output coming directly from a Lambda function.
           * The body of a Lambda function is always a stringified JSON object.
           * The mapping template for the API Gateway integration will parse the stringified JSON and return it as a JSON object.
           *
           * $parse() is used to parse the stringified JSON inside the variables temporarily back to a JSON object before the whole
           * content is stringified with $string() again.
           */
          "body" = "{% $string({'data': $parse($updateSkillBody),'historyRecord': $addHistoryRecordBody ? $parse($addHistoryRecordBody) : null}) %}"
        }
      }
    }
  })
}

