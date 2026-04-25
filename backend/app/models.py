"""
SQLAlchemy ORM models.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Scan(Base):
    """Pending scan queue entry."""

    __tablename__ = "scan"

    folder: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<Scan folder={self.folder!r} priority={self.priority} time={self.time}>"
        )


class ScanHistory(Base):
    """Completed scan history (last N entries)."""

    __tablename__ = "scan_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    folder: Mapped[str] = mapped_column(String, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    triggered_at: Mapped[datetime] = mapped_column(DateTime)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    target: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="success")  # success | error
    message: Mapped[str] = mapped_column(Text, default="")
