# Products API + AWS Learning Project

Proyecto didáctico para aprender a construir una API CRUD, desplegarla localmente con Docker, conectar PostgreSQL, trabajar con almacenamiento de imágenes y preparar la infraestructura para AWS con Terraform.

## Objetivo

- Crear, consultar, modificar y eliminar productos.
- Mantener nombre, precio y cantidad disponible (stock).
- Exponer una API REST con FastAPI.
- Servir una interfaz web simple desde la misma app.
- Probar integración con PostgreSQL.
- Preparar una arquitectura para AWS con VPC, subredes, ALB, ECS, RDS, S3 y ECR.
- Aprender buenas prácticas sobre despliegue, seguridad, costos y dependencias.

## Stack principal

- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- Docker / Docker Compose
- Terraform
- AWS (ECR, ECS Fargate, ALB, RDS, S3, IAM, VPC)

## Estado actual

### Local

La aplicación funciona localmente con:

- FastAPI
- PostgreSQL corriendo en Docker Compose
- SQLAlchemy para persistencia
- interfaz web servida desde la API
- endpoints CRUD para productos
- subida de imágenes con S3 en modo preparado para AWS

Se validaron pruebas locales de:

- creación de productos
- listado de productos
- edición parcial
- eliminación
- validación de /health
- uso de la UI web
- persistencia de datos tras recrear contenedores
- Docker build reproducible con lockfile

### AWS

La infraestructura en Terraform está definida, pero no se aplicó en una cuenta real de AWS.

La base incluye:

- VPC
- subredes públicas y privadas
- Internet Gateway
- route tables
- security groups
- RDS PostgreSQL privado
- S3 bucket para imágenes
- ECR repository
- ECS Fargate
- ALB
- CloudWatch log group
- IAM roles y políticas

Sin embargo:

- no se hizo `terraform apply` real
- no se validó `terraform plan` con credenciales AWS reales
- no se subió la imagen Docker a ECR
- no se levantó el servicio ECS en AWS
- no se validó la conexión real API → RDS y API → S3

## Cómo correrlo localmente

### Requisitos

- Docker Desktop o Docker Engine activo
- Python 3.12 (opcional si se quiere ejecutar sin Docker)

### Arranque con Docker Compose

```bash
docker compose up --build
```

Luego abrir:

- API: http://localhost:8000/
- Documentación Swagger: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Detener ambiente

```bash
docker compose down
```

Para borrar también el volumen de PostgreSQL:

```bash
docker compose down -v
```

## Endpoints principales

- `GET /health` → estado de la API
- `GET /` → interfaz web
- `POST /products` → crear producto
- `GET /products` → listar productos
- `GET /products/{id}` → obtener producto
- `PATCH /products/{id}` → actualizar parcialmente
- `DELETE /products/{id}` → eliminar producto
- `PUT /products/{id}/image` → subir imagen del producto a S3
- `GET /products/{id}/image` → obtener URL firmada temporal de la imagen

## Variables importantes

La app usa variables de entorno para conectar con la base de datos y S3, por ejemplo:

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `AWS_REGION`
- `S3_BUCKET_NAME`

Cuando no hay `DATABASE_URL`, la app intenta usar `DB_*`.

## Terraform: arquitectura definida

La carpeta `terraform/` define la infraestructura base para un entorno de aprendizaje y despliegue orientado a AWS.

### Incluye

- VPC con CIDR configurable
- subredes públicas y privadas
- gateway y rutas
- security groups para ALB, API y DB
- RDS PostgreSQL con almacenamiento encriptado
- S3 bucket privado con versión, cifrado, lifecycle y bloqueo público
- ECR con scan y lifecycle policy
- ALB HTTP
- ECS con Fargate
- CloudWatch Logs
- IAM roles para ECS y acceso a S3
- outputs útiles para referencia posterior

### Consideraciones importantes

- `desired_count` está pensado para comenzar en 0 y luego subir a 1 cuando la imagen ya exista en ECR.
- `enable_nat_gateway` es opcional y tiene costo adicional.
- `api_in_private_subnets` requiere una configuración más cuidadosa y normalmente NAT.
- la API está preparada para usar RDS y S3 reales en AWS.

## Validación realizada

Se verificó localmente que:

- la sintaxis de Terraform es válida con `terraform validate`
- la API funciona localmente
- la UI funciona en el navegador
- la base de datos persiste con Docker volume
- la app responde correctamente cuando no hay S3 configurado
- la imagen Docker se puede construir de forma reproducible usando `requirements.lock`

## Importante: AWS real aún no está aplicado

Aunque la arquitectura sea buena, eso no reemplaza un despliegue real.

Antes de aplicar en AWS se necesita:

1. credenciales AWS válidas
2. `terraform plan` real contra la cuenta correcta
3. revisar los recursos y costos
4. confirmar regiones y zonas disponibles
5. publicar la imagen Docker en ECR
6. subir el servicio ECS a 1 tarea
7. probar endpoints reales y conectividad

## Recomendación de flujo futuro

El siguiente flujo recomendado para el despliegue real en AWS es:

1. autenticar AWS correctamente
2. hacer `terraform plan`
3. revisar recursos y costos
4. `terraform apply` en etapas
5. construir imagen Docker
6. subir imagen a ECR
7. preparar `desired_count = 1`
8. validar `/health` además de DB y S3
9. revisar logs y seguridad

## Seguridad y buenas prácticas

- nunca commitear credenciales AWS ni secretos
- no guardar tokens o `.env` reales en Git
- revisar `terraform.tfstate` y no subir estado local a repositorios públicos
- mantener el entorno de pruebas por debajo de costos controlados
- no publicar servicios de forma insegura sin revisión final

## Próximos pasos ideales

- modularizar Terraform por componentes
- separar entornos `dev` y `prod`
- agregar CI/CD con GitHub Actions
- automatizar build y push a ECR
- ejecutar validaciones automáticas en pull requests
- desplegar infraestructura en AWS con estrategia progresiva

## Conclusión

Este proyecto ya tiene una base sólida para aprender infraestructura en la nube:

- API funcional localmente
- PostgreSQL con Docker
- UI funcionando
- Docker reproducible
- Terraform con arquitectura AWS definida
- preparación para despliegue real

Falta todavía la parte crítica de acceso real a AWS, apply real, validación y despliegue final. Pero la base está bien construida para continuar faltando solo la etapa de nube en una cuenta autenticada.
