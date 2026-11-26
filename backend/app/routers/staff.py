from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/staff", tags=["Staff, Shift & Salary"])


class StaffCreate(BaseModel):
    name: str
    role: str
    default_shift: str = "morning"
    daily_salary: float = 0.0


class AttendanceCreate(BaseModel):
    staff_id: int
    attendance_date: Optional[date] = None
    shift: str = "morning"
    status: str = "present"  # present, absent, half_day


@router.post("")
def add_staff(payload: StaffCreate, db: Session = Depends(get_db)):
    member = models.StaffMember(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return {
        "id": member.id,
        "name": member.name,
        "role": member.role,
        "default_shift": member.default_shift,
        "daily_salary": member.daily_salary,
    }


@router.get("")
def list_staff(db: Session = Depends(get_db)):
    members = db.query(models.StaffMember).filter(models.StaffMember.is_active == True).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "role": m.role,
            "default_shift": m.default_shift,
            "daily_salary": m.daily_salary,
        }
        for m in members
    ]


@router.post("/attendance")
def mark_attendance(payload: AttendanceCreate, db: Session = Depends(get_db)):
    staff = db.query(models.StaffMember).filter(models.StaffMember.id == payload.staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    multiplier = {"present": 1.0, "half_day": 0.5, "absent": 0.0}.get(payload.status)
    if multiplier is None:
        raise HTTPException(status_code=400, detail="Status must be present, half_day, or absent")

    earned = staff.daily_salary * multiplier
    att = models.StaffAttendance(
        staff_id=staff.id,
        attendance_date=payload.attendance_date or date.today(),
        shift=payload.shift,
        status=payload.status,
        earned_salary=earned,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return {
        "id": att.id,
        "staff_id": staff.id,
        "staff_name": staff.name,
        "date": str(att.attendance_date),
        "shift": att.shift,
        "status": att.status,
        "earned_salary": att.earned_salary,
    }


@router.get("/salary-summary")
def salary_summary(year: int, month: int, db: Session = Depends(get_db)):
    staff_list = db.query(models.StaffMember).all()
    summary = []
    for s in staff_list:
        earned = float(
            db.query(func.coalesce(func.sum(models.StaffAttendance.earned_salary), 0.0))
            .filter(
                models.StaffAttendance.staff_id == s.id,
                func.extract("year", models.StaffAttendance.attendance_date) == year,
                func.extract("month", models.StaffAttendance.attendance_date) == month,
            )
            .scalar()
            or 0.0
        )
        present_days = int(
            db.query(func.count(models.StaffAttendance.id))
            .filter(
                models.StaffAttendance.staff_id == s.id,
                models.StaffAttendance.status != "absent",
                func.extract("year", models.StaffAttendance.attendance_date) == year,
                func.extract("month", models.StaffAttendance.attendance_date) == month,
            )
            .scalar()
            or 0
        )
        summary.append(
            {
                "staff_id": s.id,
                "name": s.name,
                "role": s.role,
                "active_days": present_days,
                "monthly_salary_payable": earned,
            }
        )
    return {"year": year, "month": month, "staff_salaries": summary}