from datetime import date, datetime, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/billing", tags=["Billing & Day Closing"])


class PaymentCreate(BaseModel):
    order_id: int
    amount: float
    method: str  # cash, upi, card


class DayClosingCreate(BaseModel):
    closing_date: Optional[date] = None
    notes: Optional[str] = None


@router.post("/pay")
def record_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    if payload.method not in {"cash", "upi", "card"}:
        raise HTTPException(status_code=400, detail="Method must be cash, upi, or card")
    order = db.query(models.Order).filter(models.Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = models.Payment(
        order_id=order.id,
        amount=payload.amount,
        method=payload.method,
    )
    db.add(payment)
    order.status = "paid"
    db.commit()
    db.refresh(payment)
    return {
        "payment_id": payment.id,
        "order_id": order.id,
        "amount": payment.amount,
        "method": payment.method,
        "order_status": order.status,
    }


@router.post("/day-closing")
def close_day(payload: DayClosingCreate, db: Session = Depends(get_db)):
    target_date = payload.closing_date or date.today()
    start_dt = datetime.combine(target_date, time.min)
    end_dt = datetime.combine(target_date, time.max)

    def sum_by_method(method: str) -> float:
        val = (
            db.query(func.coalesce(func.sum(models.Payment.amount), 0.0))
            .filter(
                models.Payment.method == method,
                models.Payment.paid_at >= start_dt,
                models.Payment.paid_at <= end_dt,
            )
            .scalar()
        )
        return float(val or 0.0)

    cash_total = sum_by_method("cash")
    upi_total = sum_by_method("upi")
    card_total = sum_by_method("card")
    total_sales = cash_total + upi_total + card_total

    total_expenses = float(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0.0))
        .filter(models.Expense.expense_date == target_date)
        .scalar()
        or 0.0
    )

    existing = db.query(models.DayClosing).filter(models.DayClosing.closing_date == target_date).first()
    if existing:
        existing.cash_total = cash_total
        existing.upi_total = upi_total
        existing.card_total = card_total
        existing.total_sales = total_sales
        existing.total_expenses = total_expenses
        existing.net_profit = total_sales - total_expenses
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        record = existing
    else:
        record = models.DayClosing(
            closing_date=target_date,
            cash_total=cash_total,
            upi_total=upi_total,
            card_total=card_total,
            total_sales=total_sales,
            total_expenses=total_expenses,
            net_profit=total_sales - total_expenses,
            notes=payload.notes,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

    return {
        "id": record.id,
        "closing_date": str(record.closing_date),
        "cash_total": record.cash_total,
        "upi_total": record.upi_total,
        "card_total": record.card_total,
        "total_sales": record.total_sales,
        "total_expenses": record.total_expenses,
        "net_profit": record.net_profit,
        "notes": record.notes,
    }