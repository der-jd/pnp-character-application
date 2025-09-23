variable "project_tag_key" {
  description = "Key used for the project default tags"
  type        = string
  default     = "project"
}

variable "project_tag_value" {
  description = "Value used for the project default tags"
  type        = string
  default     = "pnp-character-application"
}

variable "backup_alert_email" {
  description = "Email address that receives CloudWatch/SNS backup failure notifications"
  type        = string
}
