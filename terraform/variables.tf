# ── Global variables ─────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used as a prefix for all resources"
  type        = string
  default     = "blue-green-demo"
}

variable "environment" {
  description = "Top-level environment tag (dev / staging / prod)"
  type        = string
  default     = "prod"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of the existing EC2 key pair for SSH access"
  type        = string
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (Amazon Linux 2023 recommended)"
  type        = string
  default     = "ami-0c02fb55956c7d316" # Amazon Linux 2023 us-east-1
}

variable "dockerhub_username" {
  description = "DockerHub username to pull images from"
  type        = string
}

variable "blue_app_version" {
  description = "Docker image tag deployed on the Blue instance"
  type        = string
  default     = "v1"
}

variable "green_app_version" {
  description = "Docker image tag deployed on the Green instance"
  type        = string
  default     = "v2"
}

variable "active_environment" {
  description = "Which environment receives live traffic: 'blue' or 'green'"
  type        = string
  default     = "blue"

  validation {
    condition     = contains(["blue", "green"], var.active_environment)
    error_message = "active_environment must be 'blue' or 'green'."
  }
}
