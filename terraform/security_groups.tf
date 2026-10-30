resource "aws_security_group" "load_balancer" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Permite HTTP desde Internet al futuro balanceador."
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP publico"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Salida necesaria para responder solicitudes"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-alb-sg"
  }
}

resource "aws_security_group" "application" {
  name        = "${local.name_prefix}-api-sg"
  description = "Permite trafico a la API solo desde el balanceador."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Trafico desde el security group del balanceador"
    from_port       = var.application_port
    to_port         = var.application_port
    protocol        = "tcp"
    security_groups = [aws_security_group.load_balancer.id]
  }

  egress {
    description = "Salida para conexiones de la API"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-api-sg"
  }
}

resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-db-sg"
  description = "Permite PostgreSQL solo desde el security group de la API."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL desde la API"
    from_port       = var.database_port
    to_port         = var.database_port
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  egress {
    description = "Salida necesaria para respuestas de la base de datos"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-db-sg"
  }
}
