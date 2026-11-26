from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/reports", tags=["Monthly Reports"])


@router.get("/monthly")
def monthly_report(year: int, month: int, db: Session = Depends(get_db)):
    total_sales = float(
        db.query(func.coalesce(func.sum(models.Payment.amount), 0.0))
        .filter(
            func.extract("year", models.Payment.paid_at) == year,
            func.extract("month", models.Payment.paid_at) == month,
        )
        .scalar()
        or 0.0
    )

    total_expenses = float(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0.0))
        .filter(
            func.extract("year", models.Expense.expense_date) == year,
            func.extract("month", models.Expense.expense_date) == month,
        )
        .scalar()
        or 0.0
    )

    expense_rows = (
        db.query(models.Expense.category, func.coalesce(func.sum(models.Expense.amount), 0.0))
        .filter(
            func.extract("year", models.Expense.expense_date) == year,
            func.extract("month", models.Expense.expense_date) == month,
        )
        .group_by(models.Expense.category)
        .all()
    )

    category_wise_expenses = {cat: float(amt) for cat, amt in expense_rows}
    total_vendor_dues = float(
        db.query(func.coalesce(func.sum(models.Vendor.balance_due), 0.0)).scalar() or 0.0
    )

    return {
        "year": year,
        "month": month,
        "total_sales": total_sales,
        "total_expenses": total_expenses,
        "net_profit": total_sales - total_expenses,
        "category_wise_expenses": category_wise_expenses,
        "total_vendor_dues": total_vendor_dues,
    }