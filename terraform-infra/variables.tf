variable "aws_region" {
  description = "AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "AWS region must be in the format 'xx-xxxx-x' (e.g., us-east-1, eu-west-2)."
  }
}

variable "openai_api_key" {
  description = "OpenAI API key for backend"
  type        = string
  sensitive   = true
}
