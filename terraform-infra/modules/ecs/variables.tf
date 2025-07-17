variable "name" {
  description = "Name for the ECS cluster and related resources"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of IDs of public subnets"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of IDs of private subnets"
  type        = list(string)
}

variable "services" {
  description = "A map of service configurations to deploy"
  type = map(object({
    repository_url = string
    container_port = number
    cpu            = number
    memory         = number
    is_public      = bool
    task_policy_arns = optional(list(string), [])
    environment    = optional(map(string), {})
  }))
}

variable "build_version" {
  description = "Build version to force task definition recreation when images change"
  type        = string
}
