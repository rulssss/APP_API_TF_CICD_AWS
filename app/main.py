import os
from contextlib import asynccontextmanager
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.database import Base, engine, get_db
from app.schemas import ProductCreate, ProductRead, ProductUpdate


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Products API", lifespan=lifespan)
STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def get_s3_bucket():
    bucket = os.getenv("S3_BUCKET_NAME")
    if not bucket:
        raise HTTPException(
            status_code=503,
            detail="La carga de imagenes requiere configurar S3_BUCKET_NAME.",
        )
    return bucket


def get_s3_client():
    return boto3.client("s3", region_name=os.getenv("AWS_REGION"))


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post(
    "/products",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.get("/products", response_model=list[ProductRead])
def list_products(db: Session = Depends(get_db)):
    return db.scalars(select(models.Product).order_by(models.Product.id)).all()


@app.get("/products/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@app.put("/products/{product_id}/image", status_code=status.HTTP_200_OK)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Formato no permitido. Usa JPEG, PNG o WebP.",
        )

    image = file.file.read(MAX_IMAGE_SIZE + 1)
    if len(image) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="La imagen supera el limite de 5 MB.")

    bucket = get_s3_bucket()
    image_key = f"products/{product_id}/image"
    try:
        get_s3_client().put_object(
            Bucket=bucket,
            Key=image_key,
            Body=image,
            ContentType=file.content_type,
        )
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=502,
            detail="No se pudo guardar la imagen en S3.",
        ) from error

    return {"product_id": product_id, "image_key": image_key}


@app.get("/products/{product_id}/image")
def get_product_image(product_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    bucket = get_s3_bucket()
    image_key = f"products/{product_id}/image"
    client = get_s3_client()
    try:
        client.head_object(Bucket=bucket, Key=image_key)
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": image_key},
            ExpiresIn=300,
        )
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
            raise HTTPException(
                status_code=404,
                detail="Este producto no tiene imagen",
            ) from error
        raise HTTPException(
            status_code=502,
            detail="No se pudo consultar la imagen en S3.",
        ) from error
    except BotoCoreError as error:
        raise HTTPException(
            status_code=502,
            detail="No se pudo consultar la imagen en S3.",
        ) from error

    return {"url": url, "expires_in": 300}


@app.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    changes: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    bucket = os.getenv("S3_BUCKET_NAME")
    if bucket:
        try:
            get_s3_client().delete_object(
                Bucket=bucket,
                Key=f"products/{product_id}/image",
            )
        except (BotoCoreError, ClientError) as error:
            raise HTTPException(
                status_code=502,
                detail="No se pudo eliminar la imagen del producto en S3.",
            ) from error

    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
