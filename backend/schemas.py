"""
schemas.py — Pydantic schemas for request/response validation.

These are the JSON shapes that the frontend sends to and receives from the API.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ── Auth schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str


# ── Detection schemas ─────────────────────────────────────────────────────────

class DetectionIn(BaseModel):
    """A single bounding-box detection sent from the frontend when saving a scan."""
    class_name: str = Field(alias="class")       # frontend uses "class" key
    class_id: int = Field(default=0)
    confidence: float
    bbox: list[float] = Field(min_length=4, max_length=4)  # [cx, cy, w, h] normalized

    model_config = {"populate_by_name": True}


class DetectionOut(BaseModel):
    """A single detection returned to the frontend."""
    id: str
    class_name: str = Field(serialization_alias="class")
    class_id: int
    confidence: float
    bbox: list[float]                             # [cx, cy, w, h] normalized

    model_config = {"populate_by_name": True, "from_attributes": True}


# ── Scan schemas ──────────────────────────────────────────────────────────────

class ScanIn(BaseModel):
    """Payload the frontend sends to POST /scans."""
    filename: str
    thumbnail: str | None = None                 # base64 data URL or empty string
    model_used: str = Field(alias="model")       # frontend sends "model" key
    inference_ms: int = Field(alias="inferenceMs", default=0)
    detections: list[DetectionIn] = []

    model_config = {"populate_by_name": True}


class ScanOut(BaseModel):
    """One scan returned to the frontend (matches the HistoryEntry shape in mock-data.ts)."""
    id: str
    filename: str
    thumbnail: str | None = None
    model: str = Field(serialization_alias="model")
    inference_ms: int = Field(serialization_alias="inferenceMs")
    date: str                                    # ISO 8601 string (frontend expects "date")
    detections: list[DetectionOut] = []

    model_config = {"populate_by_name": True, "from_attributes": False}

# ── Chat schemas ──────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
