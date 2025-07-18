terraform {
  backend "local" {}
}

# Obtain one-time ECR credentials so Docker provider can push images.
data "aws_ecr_authorization_token" "auth" {}

provider "docker" {
  registry_auth {
    address  = data.aws_ecr_authorization_token.auth.proxy_endpoint
    username = data.aws_ecr_authorization_token.auth.user_name
    password = data.aws_ecr_authorization_token.auth.password
  }
}

module "ecr_docker_images" {
  source   = "./modules/ecr_docker_images"

  aws_region = var.aws_region
  services   = local.services
  tag_suffix = local.build_version
}

module "secrets" {
  source      = "./modules/secrets"
  secrets_map = local.secrets
}

module "networking" {
  source = "./modules/networking"

  name    = "compliance-dash"
  tags    = {
    Project = "compliance-dash"
  }

  vpc_cidr = "10.0.0.0/16"
  azs      = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}

module "ecs" {
  source = "./modules/ecs"

  name    = "compliance-dash"
  tags    = {
    Project = "compliance-dash"
  }

  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids

  services      = local.ecs_services
  build_version = local.build_version
}

module "aws_config" {
  source = "./modules/aws_config"

  name         = "compliance-dash"
  tags         = {
    Project = "compliance-dash"
  }
  config_rules = local.config_rules
  
  # Set to false since you already have existing Config setup
  create_config_recorder  = false
  create_delivery_channel = false
}

output "repository_urls" {
  description = "Map of service name to ECR repository URL"
  value       = module.ecr_docker_images.repository_urls
}

output "load_balancer_url" {
  description = "The URL of the load balancer"
  value       = "http://${module.ecs.lb_dns_name}"
}

output "config_bucket_name" {
  description = "Name of the S3 bucket used for AWS Config"
  value       = module.aws_config.config_bucket_name
}

output "config_rules" {
  description = "List of created AWS Config rule names"
  value       = module.aws_config.config_rule_names
}
