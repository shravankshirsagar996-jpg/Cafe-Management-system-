from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    today = date.today()
    start_dt = datetime.combine(today, datetime.min.time())

    bills = (
        db.query(models.Bill)
        .filter(models.Bill.status == "paid", models.Bill.created_at >= start_dt)
        .all()
    )
    today_sales = round(sum(float(b.total_amount or 0.0) for b in bills), 2)

    expenses = (
        db.query(models.Expense)
        .filter(models.Expense.created_at >= start_dt)
        .all()
    )
    today_expenses = round(sum(float(e.amount or 0.0) for e in expenses), 2)

    today_profit = round(today_sales - today_expenses, 2)

    all_items = db.query(models.InventoryItem).all()
    low_stock_count = sum(
        1 for i in all_items if float(i.quantity or 0.0) <= float(i.reorder_level or 0.0)
    )

    pending_orders_count = (
        db.query(models.Order)
        .filter(models.Order.status.in_(["pending", "preparing"]))
        .count()
    )

    return {
        "today_sales": today_sales,
        "today_expenses": today_expenses,
        "today_profit": today_profit,
        "low_stock_count": low_stock_count,
        "pending_orders_count": pending_orders_count,
    }