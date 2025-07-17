locals {
  interface_endpoints = {
    "ecr_api"        = "com.amazonaws.us-east-1.ecr.api",
    "ecr_dkr"        = "com.amazonaws.us-east-1.ecr.dkr",
    "secretsmanager" = "com.amazonaws.us-east-1.secretsmanager"
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "6.0.1"

  name = var.name
  cidr = var.vpc_cidr

  azs             = var.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = true
  map_public_ip_on_launch = true

  tags = var.tags
}

resource "aws_security_group" "vpc_endpoints_sg" {
  name        = "${var.name}-vpc-endpoints-sg"
  description = "Allow HTTPS from within the VPC"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = var.tags
}

resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids
  tags              = var.tags
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = module.vpc.vpc_id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets

  security_group_ids = [
    aws_security_group.vpc_endpoints_sg.id
  ]

  tags = var.tags
}
