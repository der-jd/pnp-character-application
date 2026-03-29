variable "env" {
  description = "Environment"
  type        = string
}

variable "project_tag_key" {
  description = "Key used for the project default tag"
  type        = string
}

variable "project_tag_value" {
  description = "Value used for the project default tag"
  type        = string
}

variable "hosted_zone_name" {
  description = "The Route 53 hosted zone domain name"
  type        = string
}

variable "domain_name" {
  description = "The main domain name for the application"
  type        = string
}

variable "api_domain_name" {
  description = "The domain name for the API"
  type        = string
}

variable "local_development_allowed_origins" {
  description = "Browser origins that may call the API during local development."
  type        = list(string)
  default     = []
}

# Will be set via an environment variable in CircleCI
variable "alert_email_address" {
  description = "Email address that receives CloudWatch/SNS alert notifications"
  type        = string
}

variable "daily_backup_retention_days" {
  description = "Retention period in days for daily backups."
  type        = number
}

variable "monthly_backup_retention_days" {
  description = "Retention period in days for monthly backups."
  type        = number
}
