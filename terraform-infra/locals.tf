locals {
  # Increment to force Docker rebuild/push even if source unchanged
  build_version = 6

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
      is_public      = true
      environment = {
        # Backend URL for nginx proxy_pass via Service Connect
        BACKEND_URL = "http://backend:4000"
      }
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
}
