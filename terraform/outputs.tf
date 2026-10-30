output "vpc_id" {
  description = "ID de la VPC creada."
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "Bloque CIDR de la VPC."
  value       = aws_vpc.main.cidr_block
}

output "availability_zones" {
  description = "Zonas de disponibilidad usadas por las subredes."
  value       = var.availability_zones
}

output "public_subnet_ids" {
  description = "IDs de las subredes publicas."
  value       = { for key, subnet in aws_subnet.public : key => subnet.id }
}

output "private_subnet_ids" {
  description = "IDs de las subredes privadas."
  value       = { for key, subnet in aws_subnet.private : key => subnet.id }
}

output "security_group_ids" {
  description = "IDs de los security groups para balanceador, API y base de datos."
  value = {
    load_balancer = aws_security_group.load_balancer.id
    application   = aws_security_group.application.id
    database      = aws_security_group.database.id
  }
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR donde publicar la imagen de la API."
  value       = aws_ecr_repository.api.repository_url
}

output "s3_bucket_name" {
  description = "Nombre del bucket privado para imagenes de productos."
  value       = aws_s3_bucket.product_images.bucket
}

output "database_endpoint" {
  description = "Endpoint privado de la instancia PostgreSQL en RDS."
  value       = aws_db_instance.main.endpoint
}

output "database_secret_arn" {
  description = "ARN del secreto de administrador gestionado por RDS."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "load_balancer_url" {
  description = "URL HTTP publica del balanceador para la API y su interfaz web."
  value       = "http://${aws_lb.api.dns_name}"
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS."
  value       = aws_ecs_cluster.main.name
}

output "nat_gateway_id" {
  description = "ID del NAT Gateway, o null si enable_nat_gateway es false."
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[0].id : null
}