terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

locals {
  tag = var.tag_suffix
}

resource "aws_ecr_repository" "this" {
  for_each = var.services
  name     = each.key
  image_scanning_configuration {
    scan_on_push = true
  }
  force_delete = true
  tags = {
    ManagedBy = "Terraform"
  }
}

data "aws_ecr_authorization_token" "auth" {}

resource "docker_image" "this" {
  for_each = var.services
  name = "${aws_ecr_repository.this[each.key].repository_url}:${local.tag}"
  build {
    context    = var.services[each.key].context
    dockerfile = var.services[each.key].dockerfile
    tag        = [
      "${aws_ecr_repository.this[each.key].repository_url}:${local.tag}",
      "${aws_ecr_repository.this[each.key].repository_url}:latest"
    ]
  }
}

resource "docker_registry_image" "push_versioned" {
  for_each = var.services
  name          = "${aws_ecr_repository.this[each.key].repository_url}:${local.tag}"
  keep_remotely = true

  depends_on = [docker_image.this]
}

resource "docker_registry_image" "push_latest" {
  for_each = var.services
  name          = "${aws_ecr_repository.this[each.key].repository_url}:latest"
  keep_remotely = true

  # Force recreation when build version changes
  triggers = {
    build_version = var.tag_suffix
    image_id = docker_image.this[each.key].image_id
  }

  depends_on = [docker_image.this]
}

output "repository_urls" {
  value = { for k, repo in aws_ecr_repository.this : k => repo.repository_url }
}
