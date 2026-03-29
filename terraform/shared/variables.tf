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
