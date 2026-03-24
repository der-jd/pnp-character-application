locals {
  lambda_functions = [
    module.add_history_record_lambda.lambda_function,
    module.add_special_ability_lambda.lambda_function,
    module.apply_level_up_lambda.lambda_function,
    module.clone_character_lambda.lambda_function,
    module.create_character_lambda.lambda_function,
    module.delete_character_lambda.lambda_function,
    module.get_character_lambda.lambda_function,
    module.get_characters_lambda.lambda_function,
    module.get_history_lambda.lambda_function,
    module.get_level_up_lambda.lambda_function,
    module.get_skill_increase_cost_lambda.lambda_function,
    module.revert_history_record_lambda.lambda_function,
    module.set_history_comment_lambda.lambda_function,
    module.update_attribute_lambda.lambda_function,
    module.update_base_value_lambda.lambda_function,
    module.update_calculation_points_lambda.lambda_function,
    module.update_combat_stats_lambda.lambda_function,
    module.update_skill_lambda.lambda_function,
  ]

  state_machine_arns = [
    module.update_skill_state_machine.state_machine_arn,
    module.update_attribute_state_machine.state_machine_arn,
    module.update_base_value_state_machine.state_machine_arn,
    module.add_special_ability_state_machine.state_machine_arn,
    module.update_calculation_points_state_machine.state_machine_arn,
    module.update_combat_stats_state_machine.state_machine_arn,
    module.apply_level_up_state_machine.state_machine_arn,
    module.create_character_state_machine.state_machine_arn,
  ]
}

resource "aws_cloudwatch_dashboard" "backend" {
  dashboard_name = "pnp-app-backend"

  dashboard_body = jsonencode({
    widgets = [
      // --- API Gateway ---
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# API Gateway"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "API Requests"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { label = "Total Requests" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "API Errors"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "5XXError", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { label = "5xx Errors", color = "#d62728" }],
            ["AWS/ApiGateway", "4XXError", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { label = "4xx Errors", color = "#ff7f0e" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "API Latency"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "p99", label = "p99" }],
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "p50", label = "p50" }],
            ["AWS/ApiGateway", "Latency", "ApiName", aws_api_gateway_rest_api.pnp_rest_api.name, { stat = "Average", label = "Average" }],
          ]
        }
      },

      // --- Lambda Functions ---
      {
        type   = "text"
        x      = 0
        y      = 7
        width  = 24
        height = 1
        properties = {
          markdown = "# Lambda Functions"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Invocations"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for fn in local.lambda_functions :
            ["AWS/Lambda", "Invocations", "FunctionName", fn.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 8
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Errors"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for fn in local.lambda_functions :
            ["AWS/Lambda", "Errors", "FunctionName", fn.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 8
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Duration (Average)"
          region = data.aws_region.current.name
          stat   = "Average"
          period = 300
          metrics = [for fn in local.lambda_functions :
            ["AWS/Lambda", "Duration", "FunctionName", fn.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 14
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Throttles"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for fn in local.lambda_functions :
            ["AWS/Lambda", "Throttles", "FunctionName", fn.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 14
        width  = 8
        height = 6
        properties = {
          title  = "Lambda Concurrent Executions"
          region = data.aws_region.current.name
          stat   = "Maximum"
          period = 300
          metrics = [for fn in local.lambda_functions :
            ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", fn.function_name]
          ]
        }
      },

      // --- Step Functions ---
      {
        type   = "text"
        x      = 0
        y      = 20
        width  = 24
        height = 1
        properties = {
          markdown = "# Step Functions"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 21
        width  = 8
        height = 6
        properties = {
          title  = "Executions Started"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for arn in local.state_machine_arns :
            ["AWS/States", "ExecutionsStarted", "StateMachineArn", arn]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 21
        width  = 8
        height = 6
        properties = {
          title  = "Executions Failed"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [for arn in local.state_machine_arns :
            ["AWS/States", "ExecutionsFailed", "StateMachineArn", arn]
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 21
        width  = 8
        height = 6
        properties = {
          title  = "Execution Time (Average)"
          region = data.aws_region.current.name
          stat   = "Average"
          period = 300
          metrics = [for arn in local.state_machine_arns :
            ["AWS/States", "ExecutionTime", "StateMachineArn", arn]
          ]
        }
      },

      // --- DynamoDB ---
      {
        type   = "text"
        x      = 0
        y      = 27
        width  = 24
        height = 1
        properties = {
          markdown = "# DynamoDB"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 28
        width  = 12
        height = 6
        properties = {
          title  = "Characters Table - Read/Write Capacity"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.characters.name, { stat = "Sum", label = "Read Units" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.characters.name, { stat = "Sum", label = "Write Units" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 28
        width  = 12
        height = 6
        properties = {
          title  = "History Table - Read/Write Capacity"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.characters_history.name, { stat = "Sum", label = "Read Units" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.characters_history.name, { stat = "Sum", label = "Write Units" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 34
        width  = 12
        height = 6
        properties = {
          title  = "Characters Table - Latency"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "GetItem", { stat = "Average", label = "GetItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "PutItem", { stat = "Average", label = "PutItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "UpdateItem", { stat = "Average", label = "UpdateItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters.name, "Operation", "Query", { stat = "Average", label = "Query" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 34
        width  = 12
        height = 6
        properties = {
          title  = "History Table - Latency"
          region = data.aws_region.current.name
          period = 300
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters_history.name, "Operation", "GetItem", { stat = "Average", label = "GetItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters_history.name, "Operation", "PutItem", { stat = "Average", label = "PutItem" }],
            ["AWS/DynamoDB", "SuccessfulRequestLatency", "TableName", aws_dynamodb_table.characters_history.name, "Operation", "Query", { stat = "Average", label = "Query" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 40
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Errors"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/DynamoDB", "SystemErrors", "TableName", aws_dynamodb_table.characters.name, { label = "Characters - System Errors", color = "#d62728" }],
            ["AWS/DynamoDB", "SystemErrors", "TableName", aws_dynamodb_table.characters_history.name, { label = "History - System Errors", color = "#ff7f0e" }],
            ["AWS/DynamoDB", "UserErrors", "TableName", aws_dynamodb_table.characters.name, { label = "Characters - User Errors", color = "#9467bd" }],
            ["AWS/DynamoDB", "UserErrors", "TableName", aws_dynamodb_table.characters_history.name, { label = "History - User Errors", color = "#8c564b" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 40
        width  = 12
        height = 6
        properties = {
          title  = "DynamoDB Throttled Requests"
          region = data.aws_region.current.name
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", aws_dynamodb_table.characters.name, { label = "Characters" }],
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", aws_dynamodb_table.characters_history.name, { label = "History" }],
          ]
        }
      },
    ]
  })
}
