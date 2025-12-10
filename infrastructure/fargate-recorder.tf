/**
 * Family Helper App - Fargate Recorder Service
 *
 * Always-warm ECS Fargate container for WebRTC call recording.
 * Uses Puppeteer to join calls as invisible peer and record audio/video.
 *
 * Cost estimate: ~$5-8/month for warm container
 */

# ============================================
# ECR Repository for Recorder Service
# ============================================
resource "aws_ecr_repository" "recorder" {
  name                 = "${var.project_name}-recorder"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-recorder"
  }
}

# ECR lifecycle policy to keep only last 5 images
resource "aws_ecr_lifecycle_policy" "recorder" {
  repository = aws_ecr_repository.recorder.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ============================================
# ECS Cluster for Recorder
# ============================================
resource "aws_ecs_cluster" "recorder" {
  name = "${var.project_name}-recorder-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-recorder-cluster"
  }
}

# ============================================
# CloudWatch Log Group for Recorder
# ============================================
resource "aws_cloudwatch_log_group" "recorder" {
  name              = "/ecs/${var.project_name}-recorder-${var.environment}"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-recorder-logs"
  }
}

# ============================================
# Security Group for Recorder
# ============================================
resource "aws_security_group" "recorder" {
  name        = "${var.project_name}-recorder-sg"
  description = "Security group for Recorder Fargate service"
  vpc_id      = aws_vpc.main.id

  # Allow inbound from Lambda (API calls to recorder)
  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
    description     = "Allow Lambda to call recorder API"
  }

  # Allow all outbound (for WebRTC STUN/TURN, S3 uploads, database access)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-recorder-sg"
  }
}

# Allow Recorder to connect to RDS
resource "aws_security_group_rule" "rds_from_recorder" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.recorder.id
  description              = "Allow Recorder to access RDS"
}

# ============================================
# IAM Role for ECS Task Execution
# ============================================
resource "aws_iam_role" "recorder_execution" {
  name = "${var.project_name}-recorder-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-recorder-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "recorder_execution_basic" {
  role       = aws_iam_role.recorder_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ============================================
# IAM Role for ECS Task (Runtime)
# ============================================
resource "aws_iam_role" "recorder_task" {
  name = "${var.project_name}-recorder-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-recorder-task-role"
  }
}

# Allow recorder to upload recordings to S3
resource "aws_iam_role_policy" "recorder_s3" {
  name = "${var.project_name}-recorder-s3-policy"
  role = aws_iam_role.recorder_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.file_storage.arn}/recordings/*"
        ]
      }
    ]
  })
}

# ============================================
# ECS Task Definition
# ============================================
resource "aws_ecs_task_definition" "recorder" {
  family                   = "${var.project_name}-recorder"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"   # 0.25 vCPU
  memory                   = "512"   # 512 MB
  execution_role_arn       = aws_iam_role.recorder_execution.arn
  task_role_arn            = aws_iam_role.recorder_task.arn

  container_definitions = jsonencode([
    {
      name      = "recorder"
      image     = "${aws_ecr_repository.recorder.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3001"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.file_storage.id
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "API_BASE_URL"
          value = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.recorder.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "recorder"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-recorder-task"
  }
}

# ============================================
# Service Discovery (instead of ALB to save $16/month)
# ============================================
resource "aws_service_discovery_private_dns_namespace" "recorder" {
  name        = "recorder.${var.project_name}.local"
  description = "Private DNS namespace for recorder service discovery"
  vpc         = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-recorder-namespace"
  }
}

resource "aws_service_discovery_service" "recorder" {
  name = "recorder"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.recorder.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name = "${var.project_name}-recorder-discovery"
  }
}

# ============================================
# ECS Service (Always 1 warm container)
# ============================================
resource "aws_ecs_service" "recorder" {
  name            = "${var.project_name}-recorder"
  cluster         = aws_ecs_cluster.recorder.id
  task_definition = aws_ecs_task_definition.recorder.arn
  desired_count   = 1  # Always 1 warm container
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.recorder.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.recorder.arn
  }

  # Ensure task is replaced on deployment
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  # Ensure ECS service waits for service discovery
  depends_on = [aws_service_discovery_service.recorder]

  tags = {
    Name = "${var.project_name}-recorder-service"
  }

  # Don't fail if image doesn't exist yet
  lifecycle {
    ignore_changes = [task_definition]
  }
}

# ============================================
# Update Lambda Environment Variable
# ============================================
# Note: The Lambda function needs to be updated to include:
# RECORDER_FARGATE_URL = "http://recorder.recorder.${var.project_name}.local:3001"
#
# This needs to be added to the aws_lambda_function.api environment variables
# After applying this Terraform, update the Lambda env var.
