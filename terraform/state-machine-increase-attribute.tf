module "increase_attribute_lambda" {
  source        = "./modules/lambda_function"
  function_name = "increase-attribute"
  environment_vars = {
    TABLE_NAME_CHARACTERS = local.characters_table_name
  }
  layers          = [aws_lambda_layer_version.config.arn, aws_lambda_layer_version.utils.arn]
  role_arn        = aws_iam_role.lambda_exec_role.arn
  api_gateway_arn = aws_api_gateway_rest_api.pnp_rest_api.execution_arn
}

resource "aws_cloudwatch_log_group" "increase_attribute_state_machine_log_group" {
  name              = "/aws/vendedlogs/states/increase-attribute"
  retention_in_days = 0
}

resource "aws_sfn_state_machine" "increase_attribute_state_machine" {
  name     = "increase-attribute"
  role_arn = aws_iam_role.step_function_role.arn
  type     = "EXPRESS"
  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.increase_attribute_state_machine_log_group.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  // Examples for error handling: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html#error-handling-examples
  // Best practiceS: https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
  // Transforming input and output with JSONata: https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html
  definition = jsonencode({
    StartAt = "IncreaseAttribute",
    States = {
      IncreaseAttribute = {
        Type          = "Task",
        QueryLanguage = "JSONata",
        Resource      = module.increase_attribute_lambda.lambda_function.arn,
        Assign = {
          statusCode            = "{% $states.result.statusCode %}",
          increaseAttributeBody = "{% $states.result.body %}"
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
            // The attribute was not increased, so no history record is necessary
            Condition = "{% $parse($states.input.body).attribute.old = $parse($states.input.body).attribute.new %}",
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
            "userId"         = "{% $parse($states.input.body).userId %}",
            "type"           = "8", // ATTRIBUTE_RAISED
            "name"           = "{% $parse($states.input.body).attributeName %}",
            "data"           = "{% $parse($states.input.body).attribute %}",
            "learningMethod" = null,
            "calculationPoints" = {
              "adventurePoints" = null,
              "attributePoints" = "{% $parse($states.input.body).attributePoints %}"
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
          "body" = "{% $string({'data': $parse($increaseAttributeBody),'historyRecord': $addHistoryRecordBody ? $parse($addHistoryRecordBody) : null}) %}"
        }
      }
    }
  })
}

