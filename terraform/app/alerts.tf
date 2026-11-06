resource "aws_sns_topic" "alerts" {
  count = local.is_prod ? 1 : 0

  name = "${local.prefix}-alerts-topic-${local.suffix}"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count = local.is_prod ? 1 : 0

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email_address
}
