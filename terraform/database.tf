resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = [for subnet in aws_subnet.private : subnet.id]

  tags = {
    Name = "${local.name_prefix}-db-subnets"
  }
}

resource "aws_db_instance" "main" {
  identifier                  = "${local.name_prefix}-db"
  engine                      = "postgres"
  instance_class              = var.db_instance_class
  allocated_storage           = 20
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = var.db_name
  username                    = var.db_username
  manage_master_user_password = true
  port                        = var.database_port

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 1
  deletion_protection     = false
  skip_final_snapshot     = true

  tags = {
    Name = "${local.name_prefix}-db"
  }
}