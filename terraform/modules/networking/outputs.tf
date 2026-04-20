output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "First public subnet (used for single-instance deployments)"
  value       = aws_subnet.public_a.id
}

output "public_subnet_ids" {
  description = "Both public subnets (required for ALB)"
  value       = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

output "security_group_id" {
  value = aws_security_group.ec2_sg.id
}

output "alb_security_group_id" {
  value = aws_security_group.alb_sg.id
}
