# ── Application Load Balancer ────────────────────────────────────────────────
# The ALB forwards traffic to either the Blue or Green target group
# based on the active_environment variable.

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false # Set true in production

  tags = {
    Name    = "${var.project_name}-alb"
    Project = var.project_name
  }
}

# ── Target Groups ────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "blue" {
  name     = "${var.project_name}-tg-blue"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name        = "${var.project_name}-tg-blue"
    Environment = "blue"
  }
}

resource "aws_lb_target_group" "green" {
  name     = "${var.project_name}-tg-green"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name        = "${var.project_name}-tg-green"
    Environment = "green"
  }
}

# ── Register EC2 instances with their target groups ──────────────────────────

resource "aws_lb_target_group_attachment" "blue" {
  target_group_arn = aws_lb_target_group.blue.arn
  target_id        = var.blue_instance_id
  port             = 80
}

resource "aws_lb_target_group_attachment" "green" {
  target_group_arn = aws_lb_target_group.green.arn
  target_id        = var.green_instance_id
  port             = 80
}

# ── Listener — routes to active target group ─────────────────────────────────

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = var.active_environment == "blue" ? aws_lb_target_group.blue.arn : aws_lb_target_group.green.arn
  }

  tags = {
    Name = "${var.project_name}-listener"
  }
}
