variable "project_name" {
  description = "Prefijo para nombrar e identificar los recursos del proyecto."
  type        = string
  default     = "products-api"
}

variable "environment" {
  description = "Entorno al que pertenecen los recursos."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "Region de AWS donde se crearan los recursos."
  type        = string
  default     = "us-east-1"
}

variable "availability_zones" {
  description = "Zonas de disponibilidad; comprobar que existan en la cuenta y region antes de desplegar."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]

  validation {
    condition     = length(var.availability_zones) >= 2 && length(var.availability_zones) <= 3 && length(distinct(var.availability_zones)) == length(var.availability_zones)
    error_message = "Define entre 2 y 3 zonas de disponibilidad distintas."
  }
}

variable "vpc_cidr" {
  description = "Bloque CIDR privado de la VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Bloques CIDR de las subredes publicas, uno por zona de disponibilidad."
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == length(var.availability_zones)
    error_message = "Define una subred publica por cada zona de disponibilidad."
  }
}

variable "private_subnet_cidrs" {
  description = "Bloques CIDR de las subredes privadas, uno por zona de disponibilidad."
  type        = list(string)
  default     = ["10.20.11.0/24", "10.20.12.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == length(var.availability_zones)
    error_message = "Define una subred privada por cada zona de disponibilidad."
  }
}

variable "application_port" {
  description = "Puerto en el que escuchara la API dentro de la VPC."
  type        = number
  default     = 8000
}

variable "database_port" {
  description = "Puerto de PostgreSQL, permitido solo desde el security group de la API."
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Nombre inicial de la base de datos PostgreSQL."
  type        = string
  default     = "products"
}

variable "db_username" {
  description = "Usuario administrador de PostgreSQL; la contrasena la administra RDS en Secrets Manager."
  type        = string
  default     = "products_admin"
}

variable "db_instance_class" {
  description = "Clase de la instancia RDS. La instancia genera cargos mientras exista."
  type        = string
  default     = "db.t4g.micro"
}

variable "enable_nat_gateway" {
  description = "Crea un NAT Gateway para salida a Internet desde subredes privadas. Tiene costo por hora y transferencia."
  type        = bool
  default     = false
}

variable "api_in_private_subnets" {
  description = "Ejecuta ECS en subredes privadas; requiere NAT para acceder a ECR y CloudWatch desde ellas."
  type        = bool
  default     = false
}

variable "container_image_tag" {
  description = "Etiqueta inmutable que se publicara en ECR antes de iniciar tareas ECS."
  type        = string
  default     = "v1"
}

variable "ecs_desired_count" {
  description = "Numero de tareas API. Dejar en 0 durante el primer apply; subir a 1 despues de publicar la imagen en ECR."
  type        = number
  default     = 0

  validation {
    condition     = var.ecs_desired_count >= 0 && (!var.api_in_private_subnets || var.ecs_desired_count == 0 || var.enable_nat_gateway)
    error_message = "ECS requiere count >= 0 y NAT activo cuando las tareas usan subredes privadas."
  }
}