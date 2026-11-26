from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    app: str


class MenuItemBase(BaseModel):
    name: str
    category: str
    price: float
    is_available: bool = True


class MenuItemResponse(MenuItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    table_no: Optional[str] = None
    order_type: str = "dine_in"
    waiter_id: Optional[int] = None
    items: List[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: str


class OrderResponse(BaseModel):
    id: int
    table_no: Optional[str]
    order_type: str
    status: str
    total_amount: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InventoryCreate(BaseModel):
    name: str
    unit: str = "kg"
    current_stock: float
    min_threshold: float = 5.0


class InventoryResponse(InventoryCreate):
    id: int
    is_low_stock: bool
    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    category: str
    vendor_id: Optional[int] = None
    amount: float
    paid_amount: float = 0.0
    note: Optional[str] = None
    expense_date: Optional[date] = None


class ExpenseResponse(BaseModel):
    id: int
    category: str
    vendor_id: Optional[int]
    amount: float
    paid_amount: float
    note: Optional[str]
    expense_date: date
    model_config = ConfigDict(from_attributes=True)


class OwnerDashboardSummary(BaseModel):
    today_sales: float
    today_expenses: float
    today_profit: float
    low_stock_count: int
    pending_orders_count: int