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
variable "alert_email_address" {
  description = "Email address that receives CloudWatch/SNS alert notifications"
  type        = string
}

variable "enable_backup" {
  description = "Whether to create AWS Backup resources (vault, plan, selection). Set to false for dev environments."
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Whether to create CloudWatch alarms, SNS topic, and dashboard. Set to false for dev environments."
  type        = bool
  default     = true
}

variable "is_prod" {
  description = "Whether this is the production environment. Controls Route 53 zone creation vs. data source lookup, deletion protection, and prevent_destroy lifecycle rules."
  type        = bool
  default     = true
}
