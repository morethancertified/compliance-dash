locals {
  # Increment to force Docker rebuild/push even if source unchanged
  build_version = 12

  # Map of services to build; paths are relative to repository root
  services = {
    frontend = {
      context    = "${path.root}/../frontend"
      dockerfile = "Dockerfile"
    }
    backend = {
      context    = "${path.root}/../backend"
      dockerfile = "Dockerfile"
    }
  }

  # Secrets to create in AWS Secrets Manager
  secrets = {
    openai_api_key = var.openai_api_key
  }

  ecs_services = {
    frontend = {
      repository_url = "${module.ecr_docker_images.repository_urls["frontend"]}:${local.build_version}"
      container_port = 3000
      cpu            = 256
      memory         = 512
      is_public      = false
      environment    = {}
    }
    backend = {
      repository_url   = "${module.ecr_docker_images.repository_urls["backend"]}:${local.build_version}"
      container_port   = 4000
      cpu              = 256
      memory           = 512
      is_public        = false
      task_policy_arns = [module.secrets.read_secrets_policy_arn]
    }
  }

  # AWS Config rules for compliance monitoring
  config_rules = {
    s3-bucket-logging-enabled = {
      owner             = "AWS"
      source_identifier = "S3_BUCKET_LOGGING_ENABLED"
    }
  }
}
