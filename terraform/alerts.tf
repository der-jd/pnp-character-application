resource "aws_sns_topic" "alerts" {
  count = var.enable_monitoring ? 1 : 0
  name  = "${local.prefix}-alerts-topic"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.enable_monitoring ? 1 : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email_address
}
