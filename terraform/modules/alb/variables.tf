variable "project_name"       { type = string }
variable "vpc_id"             { type = string }
variable "public_subnet_ids"  { type = list(string) }
variable "security_group_id"  { type = string }
variable "blue_instance_id"   { type = string }
variable "green_instance_id"  { type = string }
variable "active_environment" { type = string }
