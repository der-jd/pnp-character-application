resource "aws_backup_vault" "vault" {
  name = "pnp-app-backup-vault"
}

resource "aws_backup_plan" "plan" {
  name = "pnp-app-backup-plan"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.vault.name

    # Every day at 01:00 UTC => 03:00 CEST / 02:00 CET
    schedule          = "cron(0 1 * * ? *)"
    start_window      = 180 # minutes (3 hours)
    completion_window = 300 # minutes (5 hours)

    lifecycle {
      delete_after = 90 # days
    }
  }

  rule {
    rule_name         = "monthly"
    target_vault_name = aws_backup_vault.vault.name

    # First day of every month at 02:00 UTC => 04:00 CEST / 03:00 CET
    schedule          = "cron(0 2 1 * ? *)"
    start_window      = 180 # minutes (3 hours)
    completion_window = 300 # minutes (5 hours)

    lifecycle {
      delete_after = 730 # days (24 months)
    }
  }
}

resource "aws_backup_selection" "selection" {
  name    = "dynamodb-tag-selection"
  plan_id = aws_backup_plan.plan.id

  iam_role_arn = aws_iam_role.backup_role.arn

  # Limit selection to DynamoDB tables AND require them to have the defined tag
  resources = [
    "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/*"
  ]
  condition {
    string_equals {
      key   = "aws:ResourceTag/${var.project_tag_key}"
      value = var.project_tag_value
    }
  }
}

resource "aws_iam_role" "backup_role" {
  name = "pnp-app-backup-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "backup.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_managed_policy" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_cloudwatch_metric_alarm" "backup_job_failed" {
  alarm_name          = "pnp-app-backup-job-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 3600 # seconds (1 hour)
  statistic           = "Sum"
  threshold           = 0

  alarm_description = "Alerts when an AWS Backup job for the PnP Character Application fails"
  alarm_actions     = [aws_sns_topic.backup_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "backup_job_expired" {
  alarm_name          = "pnp-app-backup-job-expired"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsExpired"
  namespace           = "AWS/Backup"
  period              = 3600 # seconds (1 hour)
  statistic           = "Sum"
  threshold           = 0

  alarm_description = "Alerts when an AWS Backup job expires (misses completion window) for the PnP Character Application"
  alarm_actions     = [aws_sns_topic.backup_alerts.arn]
}

resource "aws_sns_topic" "backup_alerts" {
  name = "pnp-app-backup-alerts-topic"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = var.backup_alert_email
}
