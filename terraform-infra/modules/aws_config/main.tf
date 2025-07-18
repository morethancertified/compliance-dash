##############################
# AWS Config Module (Compliance Dash)
# Creates AWS Config configuration recorder, delivery channel, and config rules
# for compliance monitoring
##############################

# 1. S3 bucket for AWS Config delivery channel
resource "aws_s3_bucket" "config" {
  bucket        = "${var.name}-aws-config-${random_string.suffix.result}"
  force_destroy = true

  tags = merge(var.tags, {
    Name = "${var.name}-aws-config"
  })
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "aws_s3_bucket_policy" "config" {
  bucket = aws_s3_bucket.config.id
  policy = data.aws_iam_policy_document.config_bucket_policy.json
}

data "aws_iam_policy_document" "config_bucket_policy" {
  statement {
    sid    = "AWSConfigBucketPermissionsCheck"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }
    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.config.arn]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "AWSConfigBucketExistenceCheck"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.config.arn]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "AWSConfigBucketDelivery"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["config.amazonaws.com"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.config.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

# 2. IAM role for AWS Config
resource "aws_iam_role" "config" {
  name = "${var.name}-aws-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

# 3. AWS Config configuration recorder
resource "aws_config_configuration_recorder" "this" {
  count = var.create_config_recorder ? 1 : 0

  name     = "${var.name}-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }

  depends_on = [aws_config_delivery_channel.this]
}

# 4. AWS Config delivery channel
resource "aws_config_delivery_channel" "this" {
  count = var.create_delivery_channel ? 1 : 0

  name           = "${var.name}-config-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config.bucket
}

# 5. AWS Config rules
resource "aws_config_config_rule" "this" {
  for_each = var.config_rules

  name = each.key

  source {
    owner             = each.value.owner
    source_identifier = each.value.source_identifier

    # Only add source_detail for CUSTOM_LAMBDA or CUSTOM_POLICY rules
    dynamic "source_detail" {
      for_each = each.value.owner != "AWS" && each.value.source_detail != null ? [each.value.source_detail] : []
      content {
        event_source                = source_detail.value.event_source
        maximum_execution_frequency = source_detail.value.maximum_execution_frequency
      }
    }
  }

  input_parameters = each.value.input_parameters != null ? jsonencode(each.value.input_parameters) : null

  depends_on = [aws_config_configuration_recorder.this, aws_config_delivery_channel.this]

  tags = merge(var.tags, {
    Name = each.key
  })
}

# Data sources
data "aws_caller_identity" "current" {}