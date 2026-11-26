import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["Auth & Roles"])

ALLOWED_ROLES = {"owner", "customer", "kitchen"}


class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str


class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    role: Optional[str] = None
    table_no: Optional[str] = None


def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def ensure_default_users(db: Session):
    defaults = [
        ("Cafe Holder", "owner", "owner123", "owner"),
        ("Kitchen Chef", "kitchen", "kitchen123", "kitchen"),
        ("Cafe Guest", "customer", "customer123", "customer"),
    ]
    changed = False
    for name, uname, pw, role in defaults:
        pw_hash = hash_password(pw)
        existing = db.query(models.User).filter(models.User.username == uname).first()
        if not existing:
            db.add(
                models.User(
                    name=name,
                    username=uname,
                    password_hash=pw_hash,
                    role=role,
                    is_active=True,
                )
            )
            changed = True
        else:
            if existing.password_hash != pw_hash or existing.role != role or not existing.is_active:
                existing.name = name
                existing.password_hash = pw_hash
                existing.role = role
                existing.is_active = True
                changed = True
    if changed:
        db.commit()


@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    role_clean = payload.role.strip().lower()
    if role_clean not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Role must be owner, customer, or kitchen")

    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = models.User(
        name=payload.name,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=role_clean,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "username": user.username, "role": user.role}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    ensure_default_users(db)

    if payload.role and payload.role.strip().lower() == "customer":
        table_label = f"Table {payload.table_no}" if payload.table_no else "Guest"
        return {
            "message": "Customer session started",
            "user": {
                "id": 0,
                "name": payload.username or "Customer",
                "username": payload.username or "customer",
                "role": "customer",
                "table_no": payload.table_no or "",
                "session_label": table_label,
            },
        }

    uname_clean = (payload.username or "").strip()
    user = (
        db.query(models.User)
        .filter(models.User.username == uname_clean, models.User.is_active == True)
        .first()
    )
    if not user or not payload.password or user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if payload.role and user.role != payload.role.strip().lower():
        raise HTTPException(status_code=403, detail="Selected role does not match this account")

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "role": user.role,
        },
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    ensure_default_users(db)
    users = db.query(models.User).all()
    return [
        {"id": u.id, "name": u.name, "username": u.username, "role": u.role, "is_active": u.is_active}
        for u in users
    ]