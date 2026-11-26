from datetime import date, datetime, time
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.config import settings
from app.database import Base, engine, get_db
from app.routers import auth, billing, expenses, inventory, orders, reports, staff

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(billing.router)
app.include_router(inventory.router)
app.include_router(expenses.router)
app.include_router(staff.router)
app.include_router(reports.router)


@app.get("/", response_model=schemas.HealthResponse)
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/api/dashboard/summary", response_model=schemas.OwnerDashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    today = date.today()
    start_dt = datetime.combine(today, time.min)
    end_dt = datetime.combine(today, time.max)

    today_sales = (
        db.query(func.coalesce(func.sum(models.Payment.amount), 0.0))
        .filter(models.Payment.paid_at >= start_dt, models.Payment.paid_at <= end_dt)
        .scalar()
    )

    today_expenses = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0.0))
        .filter(models.Expense.expense_date == today)
        .scalar()
    )

    low_stock_items = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.current_stock <= models.InventoryItem.min_threshold)
        .count()
    )

    pending_orders = (
        db.query(models.Order)
        .filter(models.Order.status.in_(["pending", "preparing"]))
        .count()
    )

    sales_val = float(today_sales or 0.0)
    expenses_val = float(today_expenses or 0.0)

    return {
        "today_sales": sales_val,
        "today_expenses": expenses_val,
        "today_profit": sales_val - expenses_val,
        "low_stock_count": low_stock_items,
        "pending_orders_count": pending_orders,
    }