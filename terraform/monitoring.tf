// --- CloudWatch Alarms ---

// Account-level Lambda metrics (no FunctionName dimension) aggregate across all
// functions in the region, avoiding the 10-metric-query limit per alarm.
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.prefix}-lambda-errors-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  # 2 of 3 consecutive 5-min windows must breach to avoid alerting on
  # one-off errors from invalid frontend requests (known issue).
  alarm_description = "Alerts when Lambda errors persist across multiple evaluation periods"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${local.prefix}-lambda-throttles-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_description = "Alerts when any Lambda function in the account is being throttled"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${local.prefix}-api-5xx-errors-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  # 2 of 3 consecutive 5-min windows must breach to avoid alerting on
  # one-off 5xx errors caused by invalid frontend requests (known issue).
  alarm_description = "Alerts when API 5xx errors persist across multiple evaluation periods"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "${local.prefix}-api-4xx-errors-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  alarm_description = "Alerts when the API returns more than 5 client errors in 5 minutes, which may indicate auth issues or abuse"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${local.prefix}-api-high-latency-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 8000
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.pnp_rest_api.name
  }

  # Threshold raised to 8s to tolerate Lambda cold starts (~5s p99 on low-traffic app).
  # 2 of 3 consecutive windows must breach to avoid alerting on single cold-start spikes.
  alarm_description = "Alerts when API p99 latency persistently exceeds 8 seconds (sustained cold start or performance regression)"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_characters_errors" {
  alarm_name          = "${local.prefix}-dynamodb-characters-errors-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.characters.name
  }

  alarm_description = "Alerts when DynamoDB system errors occur on the characters table"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_history_errors" {
  alarm_name          = "${local.prefix}-dynamodb-history-errors-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.characters_history.name
  }

  alarm_description = "Alerts when DynamoDB system errors occur on the history table"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}

// Account-level Step Functions metric (no StateMachineArn dimension) aggregates
// across all state machines in the region in a single query.
resource "aws_cloudwatch_metric_alarm" "step_functions_failures" {
  alarm_name          = "${local.prefix}-step-functions-failures-${local.suffix}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  metric_name         = "ExecutionsFailed"
  namespace           = "AWS/States"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  # 2 of 3 consecutive 5-min windows must breach to avoid alerting on
  # one-off failures caused by invalid frontend requests (known issue).
  alarm_description = "Alerts when Step Functions execution failures persist across multiple evaluation periods"
  alarm_actions     = [aws_sns_topic.alerts.arn]
  ok_actions        = [aws_sns_topic.alerts.arn]
}
