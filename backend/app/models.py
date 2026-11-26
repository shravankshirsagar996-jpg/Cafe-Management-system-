from datetime import date, datetime
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(80), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    category = Column(String(60), nullable=False)
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)

    order_items = relationship("OrderItem", back_populates="menu_item")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    table_no = Column(String(20), nullable=True)
    order_type = Column(String(20), default="dine_in")
    status = Column(String(20), default="pending")
    waiter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    notes = Column(String(200), nullable=True)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String(20), nullable=False)
    paid_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class DayClosing(Base):
    __tablename__ = "day_closings"

    id = Column(Integer, primary_key=True, index=True)
    closing_date = Column(Date, unique=True, default=date.today, nullable=False)
    cash_total = Column(Float, default=0.0)
    upi_total = Column(Float, default=0.0)
    card_total = Column(Float, default=0.0)
    total_sales = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    notes = Column(String(255), nullable=True)
    closed_at = Column(DateTime, default=datetime.utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    unit = Column(String(20), default="kg")
    current_stock = Column(Float, default=0.0, nullable=False)
    min_threshold = Column(Float, default=5.0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def is_low_stock(self) -> bool:
        return self.current_stock <= self.min_threshold


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=True)
    category = Column(String(80), nullable=True)
    balance_due = Column(Float, default=0.0)

    expenses = relationship("Expense", back_populates="vendor")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(80), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    note = Column(String(255), nullable=True)
    expense_date = Column(Date, default=date.today, nullable=False)

    vendor = relationship("Vendor", back_populates="expenses")


class StaffMember(Base):
    __tablename__ = "staff_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    default_shift = Column(String(30), default="morning")
    daily_salary = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

    attendance_records = relationship("StaffAttendance", back_populates="staff")


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_members.id"), nullable=False)
    attendance_date = Column(Date, default=date.today, nullable=False)
    shift = Column(String(30), default="morning")
    status = Column(String(20), default="present")
    earned_salary = Column(Float, default=0.0)

    staff = relationship("StaffMember", back_populates="attendance_records")