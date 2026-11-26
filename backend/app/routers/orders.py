from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/orders", tags=["Orders & Kitchen"])


class MenuCreate(BaseModel):
    name: str
    category: str
    price: float
    is_available: bool = True


@router.post("/menu", response_model=schemas.MenuItemResponse)
def add_menu_item(payload: MenuCreate, db: Session = Depends(get_db)):
    item = models.MenuItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/menu", response_model=List[schemas.MenuItemResponse])
def get_menu(db: Session = Depends(get_db)):
    return db.query(models.MenuItem).all()


@router.post("", response_model=schemas.OrderResponse)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    order = models.Order(
        table_no=payload.table_no,
        order_type=payload.order_type,
        waiter_id=payload.waiter_id,
        status="pending",
    )
    db.add(order)
    db.flush()

    total = 0.0
    for item in payload.items:
        menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.menu_item_id} not found")
        total += menu_item.price * item.quantity
        db.add(
            models.OrderItem(
                order_id=order.id,
                menu_item_id=menu_item.id,
                quantity=item.quantity,
                unit_price=menu_item.price,
                notes=item.notes,
            )
        )

    order.total_amount = total
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=List[schemas.OrderResponse])
def list_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Order)
    if status:
        q = q.filter(models.Order.status == status)
    return q.order_by(models.Order.id.desc()).all()


@router.get("/kitchen")
def kitchen_queue(db: Session = Depends(get_db)):
    orders = (
        db.query(models.Order)
        .filter(models.Order.status.in_(["pending", "preparing"]))
        .order_by(models.Order.id.asc())
        .all()
    )
    result = []
    for o in orders:
        items_detail = []
        for oi in o.items:
            m = db.query(models.MenuItem).filter(models.MenuItem.id == oi.menu_item_id).first()
            items_detail.append(
                {
                    "name": m.name if m else f"Item #{oi.menu_item_id}",
                    "quantity": oi.quantity,
                    "notes": oi.notes,
                }
            )
        result.append(
            {
                "id": o.id,
                "table_no": o.table_no,
                "order_type": o.order_type,
                "status": o.status,
                "items": items_detail,
            }
        )
    return result


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(order_id: int, payload: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    valid = {"pending", "preparing", "ready", "served", "paid", "cancelled"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid order status")
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order