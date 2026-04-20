# ── Root module — wires together all child modules ──────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to store state remotely (recommended for teams)
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "blue-green/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ── Networking ───────────────────────────────────────────────────────────────
module "networking" {
  source = "./modules/networking"

  project_name = var.project_name
  environment  = var.environment
}

# ── EC2 instances (Blue + Green) ─────────────────────────────────────────────
module "ec2" {
  source = "./modules/ec2"

  project_name      = var.project_name
  instance_type     = var.instance_type
  key_name          = var.key_name
  security_group_id = module.networking.security_group_id
  subnet_id         = module.networking.public_subnet_id
  ami_id            = var.ami_id

  blue_app_version  = var.blue_app_version
  green_app_version = var.green_app_version

  dockerhub_username = var.dockerhub_username
}

# ── Application Load Balancer ────────────────────────────────────────────────
module "alb" {
  source = "./modules/alb"

  project_name      = var.project_name
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  security_group_id = module.networking.alb_security_group_id

  blue_instance_id  = module.ec2.blue_instance_id
  green_instance_id = module.ec2.green_instance_id

  # "blue" or "green" — controls which target group is active
  active_environment = var.active_environment
}
