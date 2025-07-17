# Service Discovery namespace for Service Connect
resource "aws_service_discovery_http_namespace" "this" {
  name = var.name
  tags = var.tags
}

resource "aws_ecs_cluster" "this" {
  name = var.name
  tags = var.tags

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.this.arn
  }
}

resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb.id]
  subnets            = var.public_subnet_ids

  tags = var.tags
}

resource "aws_security_group" "lb" {
  name        = "${var.name}-lb-sg"
  description = "Allow HTTP traffic to load balancer"
  vpc_id      = var.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.name}-tasks-sg"
  description = "Allow traffic to ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = 0
    to_port         = 65535
    security_groups = [aws_security_group.lb.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_ecr" {
  name = "${var.name}-ecs-task-execution-ecr-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "task_roles" {
  for_each = var.services

  name = "${var.name}-${each.key}-task-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

locals {
  service_policy_attachments = {
    for attachment in flatten([
      for service_key, service in var.services :
      [
        for policy_arn in service.task_policy_arns : {
          service_key = service_key
          policy_arn  = policy_arn
        }
      ]
    ]) : "${attachment.service_key}-${basename(attachment.policy_arn)}" => attachment
  }
}

resource "aws_iam_role_policy_attachment" "task_roles" {
  for_each = local.service_policy_attachments

  role       = aws_iam_role.task_roles[each.value.service_key].name
  policy_arn = each.value.policy_arn
}

resource "aws_ecs_task_definition" "this" {
  for_each = var.services

  family                   = "${var.name}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.task_roles[each.key].arn

  container_definitions = jsonencode([{
    name      = each.key
    image     = each.value.repository_url
    cpu       = each.value.cpu
    memory    = each.value.memory
    essential = true
    portMappings = [
      {
        name          = each.key == "backend" ? "backend" : null
        containerPort = each.value.container_port
        hostPort      = each.value.container_port
        protocol      = "tcp"
      }
    ]
    environment = [
      for k, v in each.value.environment : { name = k, value = v }
    ]
  }])

  tags = merge(var.tags, {
    # Force task definition recreation when build version changes
    BuildVersion = var.build_version
  })
}

# Only create target group for frontend (backend accessed via Service Connect)
resource "aws_lb_target_group" "this" {
  for_each = { for k, v in var.services : k => v if k == "frontend" }

  name        = "${var.name}-${each.key}-tg"
  port        = each.value.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
  }

  tags = var.tags
}

# Frontend listener rule - all traffic goes to frontend
# Frontend will proxy /api/* requests to backend via Service Connect
resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this["frontend"].arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

resource "aws_ecs_service" "this" {
  for_each = var.services

  name            = "${var.name}-${each.key}"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = each.value.is_public ? var.public_subnet_ids : var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = each.value.is_public
  }

  # Service Connect configuration
  service_connect_configuration {
    enabled = true
    
    # Backend service provides an endpoint for other services to connect to
    dynamic "service" {
      for_each = each.key == "backend" ? [1] : []
      content {
        port_name      = "backend"
        discovery_name = "backend"
        
        client_alias {
          port     = each.value.container_port
          dns_name = "backend"
        }
      }
    }
  }

  # Only attach load balancer to frontend service (backend will be accessed via Service Connect)
  dynamic "load_balancer" {
    for_each = each.key == "frontend" ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.this[each.key].arn
      container_name   = each.key
      container_port   = each.value.container_port
    }
  }

  tags = var.tags
}
