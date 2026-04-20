# ── Root outputs ─────────────────────────────────────────────────────────────

output "alb_dns_name" {
  description = "Public DNS of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "blue_instance_public_ip" {
  description = "Public IP of the Blue EC2 instance"
  value       = module.ec2.blue_instance_public_ip
}

output "green_instance_public_ip" {
  description = "Public IP of the Green EC2 instance"
  value       = module.ec2.green_instance_public_ip
}

output "active_environment" {
  description = "Currently active deployment environment"
  value       = var.active_environment
}
