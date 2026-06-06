"""
models.py — SQLAlchemy ORM models for PostgreSQL.

Tables:
  - scans       → one row per image analysis
  - detections  → one row per detected object (child of scans)
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    scans: Mapped[list["Scan"]] = relationship(
        "Scan",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Scan(Base):
    """One scan = one image uploaded and analysed by the YOLO backend."""

    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)   # base64 or file path
    model_used: Mapped[str] = mapped_column(String(32), nullable=False)  # "YOLOv8s" | "YOLOv12s"
    inference_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # One scan → many detections
    detections: Mapped[list["Detection"]] = relationship(
        "Detection",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="selectin",  # auto-load detections with each scan query
    )
    
    # Many-to-one back reference
    user: Mapped["User"] = relationship("User", back_populates="scans")


class Detection(Base):
    """One detection = one bounding box found by YOLO in a scan."""

    __tablename__ = "detections"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    scan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_name: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "Black Spot"
    class_id: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Bounding box stored as 4 normalized floats (x_center, y_center, width, height)
    bbox_x: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_w: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_h: Mapped[float] = mapped_column(Float, nullable=False)

    # Many-to-one back reference
    scan: Mapped["Scan"] = relationship("Scan", back_populates="detections")
