from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Stock"])


class StockAdjust(BaseModel):
    delta: float  # positive to add stock, negative to consume


@router.post("", response_model=schemas.InventoryResponse)
def add_inventory_item(payload: schemas.InventoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.InventoryItem).filter(models.InventoryItem.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Inventory item already exists")
    item = models.InventoryItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=List[schemas.InventoryResponse])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(models.InventoryItem).order_by(models.InventoryItem.name.asc()).all()


@router.get("/low-stock", response_model=List[schemas.InventoryResponse])
def low_stock_alerts(db: Session = Depends(get_db)):
    return (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.current_stock <= models.InventoryItem.min_threshold)
        .all()
    )


@router.patch("/{item_id}/adjust", response_model=schemas.InventoryResponse)
def adjust_stock(item_id: int, payload: StockAdjust, db: Session = Depends(get_db)):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    new_stock = item.current_stock + payload.delta
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot go below zero")
    item.current_stock = new_stock
    db.commit()
    db.refresh(item)
    return item