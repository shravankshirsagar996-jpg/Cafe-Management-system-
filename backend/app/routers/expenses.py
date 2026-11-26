from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/expenses", tags=["Expenses & Vendors"])


class VendorCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    category: Optional[str] = None
    balance_due: float = 0.0


class VendorPayDue(BaseModel):
    amount: float


@router.post("/vendors")
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    vendor = models.Vendor(**payload.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return {
        "id": vendor.id,
        "name": vendor.name,
        "phone": vendor.phone,
        "category": vendor.category,
        "balance_due": vendor.balance_due,
    }


@router.get("/vendors")
def list_vendors(db: Session = Depends(get_db)):
    vendors = db.query(models.Vendor).all()
    return [
        {
            "id": v.id,
            "name": v.name,
            "phone": v.phone,
            "category": v.category,
            "balance_due": v.balance_due,
        }
        for v in vendors
    ]


@router.post("/vendors/{vendor_id}/pay-due")
def pay_vendor_due(vendor_id: int, payload: VendorPayDue, db: Session = Depends(get_db)):
    vendor = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    vendor.balance_due = max(0.0, vendor.balance_due - payload.amount)
    db.commit()
    db.refresh(vendor)
    return {"vendor_id": vendor.id, "name": vendor.name, "remaining_due": vendor.balance_due}


@router.post("", response_model=schemas.ExpenseResponse)
def add_expense(payload: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    due = max(0.0, payload.amount - payload.paid_amount)
    if payload.vendor_id:
        vendor = db.query(models.Vendor).filter(models.Vendor.id == payload.vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        vendor.balance_due += due

    exp = models.Expense(
        category=payload.category,
        vendor_id=payload.vendor_id,
        amount=payload.amount,
        paid_amount=payload.paid_amount,
        note=payload.note,
        expense_date=payload.expense_date or date.today(),
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp


@router.get("", response_model=List[schemas.ExpenseResponse])
def list_expenses(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Expense)
    if category:
        q = q.filter(models.Expense.category == category)
    return q.order_by(models.Expense.id.desc()).all()