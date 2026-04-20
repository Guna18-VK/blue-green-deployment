# ── EC2 Instances: Blue and Green ────────────────────────────────────────────

# ── Blue Instance ────────────────────────────────────────────────────────────
resource "aws_instance" "blue" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment        = "blue"
    app_version        = var.blue_app_version
    dockerhub_username = var.dockerhub_username
  }))

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "${var.project_name}-blue"
    Environment = "blue"
    Version     = var.blue_app_version
    Project     = var.project_name
  }
}

# ── Green Instance ───────────────────────────────────────────────────────────
resource "aws_instance" "green" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment        = "green"
    app_version        = var.green_app_version
    dockerhub_username = var.dockerhub_username
  }))

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "${var.project_name}-green"
    Environment = "green"
    Version     = var.green_app_version
    Project     = var.project_name
  }
}
