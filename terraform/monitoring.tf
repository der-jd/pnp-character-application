// --- SNS Topic for backend monitoring alerts ---

resource "aws_sns_topic" "monitoring_alerts" {
  name = "pnp-app-monitoring-alerts-topic"
}

resource "aws_sns_topic_subscription" "monitoring_email" {
  topic_arn = aws_sns_topic.monitoring_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_address
}

// --- CloudWatch Alarms ---

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

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "pnp-app-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "errors"
    expression  = "SUM(METRICS())"
    label       = "Total Lambda Errors"
    return_data = true
  }

  dynamic "metric_query" {
    for_each = local.lambda_functions
    content {
      id = "e_${replace(metric_query.value.function_name, "-", "_")}"
      metric {
        metric_name = "Errors"
        namespace   = "AWS/Lambda"
        period      = 300
        stat        = "Sum"
        dimensions = {
          FunctionName = metric_query.value.function_name
        }
      }
    }
  }

  alarm_description = "Alerts when any Lambda function produces errors"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "pnp-app-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "throttles"
    expression  = "SUM(METRICS())"
    label       = "Total Lambda Throttles"
    return_data = true
  }

  dynamic "metric_query" {
    for_each = local.lambda_functions
    content {
      id = "t_${replace(metric_query.value.function_name, "-", "_")}"
      metric {
        metric_name = "Throttles"
        namespace   = "AWS/Lambda"
        period      = 300
        stat        = "Sum"
        dimensions = {
          FunctionName = metric_query.value.function_name
        }
      }
    }
  }

  alarm_description = "Alerts when any Lambda function is being throttled"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "pnp-app-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when the API returns 5xx server errors"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "pnp-app-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when the API returns more than 5 client errors in 5 minutes, which may indicate auth issues or abuse"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "pnp-app-api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 3000

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when API p99 latency exceeds 3 seconds"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_characters_errors" {
  alarm_name          = "pnp-app-dynamodb-characters-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    TableName = aws_dynamodb_table.characters.name
  }

  alarm_description = "Alerts when DynamoDB system errors occur on the characters table"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_history_errors" {
  alarm_name          = "pnp-app-dynamodb-history-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    TableName = aws_dynamodb_table.characters_history.name
  }

  alarm_description = "Alerts when DynamoDB system errors occur on the history table"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "step_functions_failures" {
  alarm_name          = "pnp-app-step-functions-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0

  metric_query {
    id          = "failures"
    expression  = "SUM(METRICS())"
    label       = "Total Step Function Failures"
    return_data = true
  }

  dynamic "metric_query" {
    for_each = local.state_machine_arns
    content {
      id = "f_${metric_query.key}"
      metric {
        metric_name = "ExecutionsFailed"
        namespace   = "AWS/States"
        period      = 300
        stat        = "Sum"
        dimensions = {
          StateMachineArn = metric_query.value
        }
      }
    }
  }

  alarm_description = "Alerts when any Step Functions state machine execution fails"
  alarm_actions     = [aws_sns_topic.monitoring_alerts.arn]
  ok_actions        = [aws_sns_topic.monitoring_alerts.arn]
}
