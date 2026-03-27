variable "state_machine_name" {
  type        = string
  description = "Name of the state machine (e.g., 'update-skill')"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for the state machine name (e.g., 'pnp-app-prod')"
}

variable "role_arn" {
  type        = string
  description = "ARN of the IAM role for the state machine"
}

variable "main_lambda_arn" {
  type        = string
  description = "ARN of the main lambda function to execute"
}

variable "history_lambda_arn" {
  type        = string
  description = "ARN of the history record lambda function"
}

variable "main_state_name" {
  type        = string
  description = "Name of the main execution state"
}

variable "main_operation_history_record_condition" {
  type        = string
  description = "If this JSONata condition is true, create a history record for main operations. Use '{% true %}' to always create, '{% false %}' to never create, or a conditional expression."
}

variable "character_id_expression" {
  type        = string
  description = "JSONata expression to extract character ID. All lambdas return characterId in response, so default is '{% $parse($mainOperationResult).characterId %}'."
  default     = "{% $parse($mainOperationResult).characterId %}"
}

variable "main_operation_history_record_request" {
  type = object({
    userId_expression           = string
    type                        = string
    name_expression             = string
    data_expression             = string
    learning_method_expression  = optional(string, null)
    adventure_points_expression = optional(string, null)
    attribute_points_expression = optional(string, null)
    comment_expression          = optional(string, null)
  })
  description = "Request body for the history record creation of main operations"
}

variable "version_update_history_record_condition" {
  type        = string
  description = "If this JSONata condition is true, create a history record for version updates. Use '{% true %}' to always create, '{% false %}' to never create, or a conditional expression."
}

// This variable is only used for the create character endpoint which has a different response structure than the other update endpoints.
variable "include_version_history_record_in_response" {
  type        = bool
  description = "Whether to include versionUpdateHistoryRecord in the response. If true, the field is included (null when no record is created). If false, the field is completely omitted."
  default     = true
}

resource "aws_cloudwatch_log_group" "state_machine_log_group" {
  name              = "/aws/vendedlogs/states/${var.name_prefix}-${var.state_machine_name}"
  retention_in_days = 0
}

// Common retry policy for Lambda service exceptions
locals {
  lambda_service_retry = {
    // Retry in case of Lambda service exceptions
    ErrorEquals = [
      "Lambda.ClientExecutionTimeoutException",
      "Lambda.ServiceException",
      "Lambda.AWSLambdaException",
      "Lambda.SdkClientException"
    ]
    IntervalSeconds = 1
    MaxAttempts     = 4
    BackoffRate     = 1.5 // Multiply the retry IntervalSeconds with this number after each retry -> exponential growth
    MaxDelaySeconds = 3   // Cap exponential retry interval
  }

  general_retry = {
    ErrorEquals     = ["States.ALL"]
    IntervalSeconds = 1
    MaxAttempts     = 2
    BackoffRate     = 1
  }

  error_catch = [{
    ErrorEquals = ["States.ALL"] // Fail on all errors if retries not defined or exceeded
    Next        = "HandleError"
  }]
}

resource "aws_sfn_state_machine" "state_machine" {
  name     = "${var.name_prefix}-${var.state_machine_name}"
  role_arn = var.role_arn
  type     = "EXPRESS"

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.state_machine_log_group.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  // Examples for error handling: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html#error-handling-examples
  // Best practices: https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
  // Transforming input and output with JSONata: https://docs.aws.amazon.com/step-functions/latest/dg/transforming-data.html
  definition = jsonencode({
    StartAt = var.main_state_name
    States = {
      "${var.main_state_name}" = {
        Type          = "Task"
        QueryLanguage = "JSONata"
        Resource      = var.main_lambda_arn
        Assign = {
          statusCode          = "{% $states.result.statusCode %}"
          mainOperationResult = "{% $states.result.body %}"
        }
        TimeoutSeconds = 5
        Retry = [
          local.lambda_service_retry,
          local.general_retry
        ]
        Catch = local.error_catch
        Next  = "IsVersionHistoryRecordNecessary"
      },
      IsVersionHistoryRecordNecessary = {
        Type          = "Choice"
        QueryLanguage = "JSONata"
        Choices = [
          {
            Condition = var.version_update_history_record_condition
            Next      = "AddVersionHistoryRecord"
          }
        ]
        Default = "IsMainOperationHistoryRecordNecessary"
      },
      AddVersionHistoryRecord = {
        Type          = "Task"
        QueryLanguage = "JSONata"
        Resource      = var.history_lambda_arn
        Arguments = {
          "pathParameters" = {
            "character-id" = var.character_id_expression
          }
          "body" = {
            "userId"         = "{% $parse($mainOperationResult).userId %}"
            "type"           = "8" // RULESET_VERSION_UPDATED
            "name"           = "{% 'Update to ruleset version ' & $parse($mainOperationResult).versionUpdate.new.value %}"
            "data"           = "{% $parse($mainOperationResult).versionUpdate %}"
            "learningMethod" = null
            "calculationPoints" = {
              "adventurePoints" = null
              "attributePoints" = null
            }
            "comment" = null
          }
        }
        Assign = {
          addVersionHistoryRecordResult = "{% $states.result.body %}"
        }
        TimeoutSeconds = 5
        Retry = [
          local.lambda_service_retry,
          local.general_retry
        ]
        Catch = local.error_catch
        Next  = "IsMainOperationHistoryRecordNecessary"
      },
      IsMainOperationHistoryRecordNecessary = {
        Type          = "Choice"
        QueryLanguage = "JSONata"
        Choices = [
          {
            Condition = var.main_operation_history_record_condition
            Next      = "AddMainOperationHistoryRecord"
          }
        ]
        Default = "SuccessState"
      },
      AddMainOperationHistoryRecord = {
        Type          = "Task"
        QueryLanguage = "JSONata"
        Resource      = var.history_lambda_arn
        Arguments = {
          "pathParameters" = {
            "character-id" = var.character_id_expression
          }
          "body" = {
            "userId"         = var.main_operation_history_record_request.userId_expression
            "type"           = var.main_operation_history_record_request.type
            "name"           = var.main_operation_history_record_request.name_expression
            "data"           = var.main_operation_history_record_request.data_expression
            "learningMethod" = var.main_operation_history_record_request.learning_method_expression
            "calculationPoints" = {
              "adventurePoints" = var.main_operation_history_record_request.adventure_points_expression
              "attributePoints" = var.main_operation_history_record_request.attribute_points_expression
            }
            "comment" = var.main_operation_history_record_request.comment_expression
          }
        }
        Assign = {
          addMainOperationHistoryRecordResult = "{% $states.result.body %}"
        }
        TimeoutSeconds = 5
        Retry = [
          local.lambda_service_retry,
          local.general_retry
        ]
        Catch = local.error_catch
        Next  = "SuccessState"
      },
      HandleError = {
        Type          = "Pass"
        QueryLanguage = "JSONata"
        Output = {
          "errorMessage" = "{% $parse($states.input.Cause).errorMessage %}"
        }
        End = true
      },
      SuccessState = {
        Type          = "Succeed"
        QueryLanguage = "JSONata"
        Output = {
          "statusCode" = "{% $statusCode %}"
          /**
           * The content of "body" should be a stringified JSON to be consistent with output coming directly from a Lambda function.
           * The body of a Lambda function is always a stringified JSON object.
           * The mapping template for the API Gateway integration will parse the stringified JSON and return it as a JSON object.
           *
           * $parse() is used to parse the stringified JSON inside the variables temporarily back to a JSON object before the whole
           * content is stringified with $string() again.
           */
          "body" = "{% $boolean(${var.include_version_history_record_in_response}) ? $string({'data': $parse($mainOperationResult), 'historyRecord': $addMainOperationHistoryRecordResult ? $parse($addMainOperationHistoryRecordResult) : null, 'versionUpdateHistoryRecord': $addVersionHistoryRecordResult ? $parse($addVersionHistoryRecordResult) : null}) : $string({'data': $parse($mainOperationResult), 'historyRecord': $addMainOperationHistoryRecordResult ? $parse($addMainOperationHistoryRecordResult) : null}) %}"
        }
      }
    }
  })
}
