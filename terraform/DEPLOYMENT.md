# Despliegue en AWS

Esta configuracion prepara la red y los servicios AWS para la API. Terraform puede crear recursos, pero no construye ni sube la imagen Docker: eso se hace con Docker hacia el repositorio ECR creado en la primera fase.

## Recursos incluidos

- VPC, subredes publicas/privadas, tablas de rutas, Internet Gateway y endpoint de gateway para S3.
- Security groups: Internet -> ALB por HTTP 80; ALB -> API por 8000; API -> PostgreSQL por 5432.
- Bucket privado S3 con bloqueo de acceso publico, cifrado, versionado y expiracion de versiones antiguas.
- Repositorio ECR inmutable con escaneo de imagenes y politica de limpieza.
- RDS PostgreSQL privado; RDS administra la contrasena en Secrets Manager.
- ECS Fargate ARM64, ALB, roles IAM y logs de CloudWatch.

No se ha ejecutado `terraform apply`; validar el plan y los costos antes de crear recursos.

## Preparar configuracion

Desde la carpeta raiz del repo:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edita `terraform/terraform.tfvars`: elige la region y zonas de disponibilidad que existan en tu cuenta. Cada zona necesita un CIDR publico y uno privado. El archivo `terraform.tfvars` esta ignorado por Git.

Autentica AWS con el perfil o metodo temporal de tu laboratorio y comprueba la sesion localmente:

```bash
aws sts get-caller-identity
```

No pegues claves, tokens ni la salida completa de identidad en chats.

## Revisar Terraform

```bash
terraform -chdir=terraform init
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform plan -out=infra.tfplan
terraform -chdir=terraform show infra.tfplan
```

El archivo del plan se guarda dentro de `terraform/` y esta ignorado por Git. Revisa cada recurso, la region, los CIDR y los costos. Para crear recursos, y solo despues de decidirlo, ejecuta:

```bash
terraform -chdir=terraform apply infra.tfplan
```

La primera aplicacion usa `ecs_desired_count = 0`: crea los recursos, pero no arranca tareas de la API. Aun asi, ALB y RDS tienen cargos mientras existan.

## Publicar la imagen

Despues del primer `apply`, Terraform imprime `ecr_repository_url`. El repositorio es ECR; ECS todavia no tiene una imagen publicada. En macOS con Docker Desktop, usa ARM64, igual que la definicion ECS:

```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_URL="$(terraform -chdir=terraform output -raw ecr_repository_url)"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
docker buildx build --platform linux/arm64 --tag "$ECR_URL:v1" --push .
```

Las etiquetas ECR son inmutables: para una nueva version usa otra etiqueta, por ejemplo `v2`, y cambia `container_image_tag` en `terraform.tfvars` antes de actualizar la task definition.

## Arrancar ECS

En `terraform/terraform.tfvars`, cambia `ecs_desired_count = 0` a `ecs_desired_count = 1`, luego revisa y aplica otra vez:

```bash
terraform -chdir=terraform plan -out=infra.tfplan
terraform -chdir=terraform show infra.tfplan
terraform -chdir=terraform apply infra.tfplan
```

Cuando ECS indique una tarea sana, `terraform -chdir=terraform output -raw load_balancer_url` muestra la URL HTTP. Prueba `/health` y `/docs` en esa URL. La interfaz y API se sirven desde el mismo contenedor.

## Red, datos y costos

- Modo economico de aprendizaje: `api_in_private_subnets = false`, ECS usa subredes publicas con IP de salida; su security group solo permite trafico entrante desde el ALB. La base sigue privada.
- Modo privado: cambia `api_in_private_subnets = true` y `enable_nat_gateway = true`. El NAT permite que tareas privadas descarguen imagenes de ECR y envien logs, pero tiene costo horario y por transferencia.
- ALB, RDS, tareas ECS activas, almacenamiento/solicitudes S3, imagenes ECR, logs y Secrets Manager pueden generar cargos. ECS con count 0 no elimina los costos de ALB/RDS.
- RDS se crea vacio; los datos de PostgreSQL local no se copian automaticamente. Esta configuracion de practica elimina RDS sin snapshot final y sin proteccion contra borrado: `terraform destroy` puede perder los datos definitivamente.
- S3 bloquea acceso publico. La API recibe permisos por el rol IAM de tarea, sin claves AWS en el codigo. Subir y consultar imagenes esta implementado en la API; el upload limita a 5 MB y JPEG/PNG/WebP.
- El ALB esta en HTTP y la API no tiene autenticacion de usuarios. No guardar datos reales ni dejarlo expuesto como servicio publico hasta agregar HTTPS, dominio y autenticacion.
- Terraform usa estado local en `terraform/terraform.tfstate`. No lo borres ni lo subas a Git. Antes de trabajar en equipo o uso estable, migrar a backend remoto cifrado con bloqueo.

No vacies el bucket ni ejecutes `terraform destroy` sin confirmar primero que quieres perder sus datos y la base RDS.
