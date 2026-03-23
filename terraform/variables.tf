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

variable "domain_name" {
  description = "The main domain name for the application"
  type        = string
}

variable "api_domain_name" {
  description = "The domain name for the API"
  type        = string
}

// Will be set via an environment variable in CircleCI
variable "backup_alert_email" {
  description = "Email address that receives CloudWatch/SNS backup failure notifications"
  type        = string
}

// Will be set via an environment variable in CircleCI
variable "enable_monitoring" {
  description = "Whether to create backend monitoring resources (CloudWatch alarms, dashboards, SNS topic)"
  type        = bool
  default     = false
}
