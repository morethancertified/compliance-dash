variable "name" {
  description = "Name prefix for AWS Config resources"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "config_rules" {
  description = "Map of AWS Config rules to create"
  type = map(object({
    owner             = string
    source_identifier = string
    source_detail = optional(object({
      event_source                = string
      maximum_execution_frequency = string
    }))
    input_parameters = optional(map(string))
  }))
  default = {}
}

variable "create_config_recorder" {
  description = "Whether to create AWS Config configuration recorder"
  type        = bool
  default     = true
}

variable "create_delivery_channel" {
  description = "Whether to create AWS Config delivery channel"
  type        = bool
  default     = true
}