output "config_bucket_name" {
  description = "Name of the S3 bucket used for AWS Config"
  value       = aws_s3_bucket.config.bucket
}

output "config_bucket_arn" {
  description = "ARN of the S3 bucket used for AWS Config"
  value       = aws_s3_bucket.config.arn
}

output "configuration_recorder_name" {
  description = "Name of the AWS Config configuration recorder"
  value       = var.create_config_recorder ? aws_config_configuration_recorder.this[0].name : null
}

output "delivery_channel_name" {
  description = "Name of the AWS Config delivery channel"
  value       = var.create_delivery_channel ? aws_config_delivery_channel.this[0].name : null
}

output "config_rule_names" {
  description = "Names of the created AWS Config rules"
  value       = [for rule in aws_config_config_rule.this : rule.name]
}

output "config_rule_arns" {
  description = "ARNs of the created AWS Config rules"
  value       = [for rule in aws_config_config_rule.this : rule.arn]
}