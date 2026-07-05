from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .database import Base
import enum

class EventType(str, enum.Enum):
    lecture = "lecture"
    practice = "practice"
    lab = "lab"
    deadline = "deadline"
    exam = "exam"
    custom = "custom"

class ControlPointType(str, enum.Enum):
    homework = "homework"
    test = "test"
    exam = "exam"
    coursework = "coursework"
    other = "other"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    # MRSU
    mrsu_username = Column(String, nullable=True)
    mrsu_password_encrypted = Column(String, nullable=True)
    mrsu_access_token = Column(String, nullable=True)
    mrsu_token_expires_at = Column(DateTime, nullable=True)
    is_mrsu_verified = Column(Boolean, default=False)

    # Google
    google_refresh_token = Column(String, nullable=True)
    google_calendar_id = Column(String, nullable=True)  # id календаря хронеллы в Google
    is_google_verified = Column(Boolean, default=False)

    events = relationship("Event", back_populates="user")
    disciplines = relationship("Discipline", back_populates="user")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    type = Column(String, nullable=True, default=None) # lecture/practice/lab/custom
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)   # аудитория
    teacher = Column(String, nullable=True)
    description = Column(String, nullable=True)

    is_visited = Column(Boolean, nullable=True)   # None = не отмечено
    is_modified = Column(Boolean, default=False)  # студент редактировал вручную
    eios_raw = Column(JSON, nullable=True)         # оригинал из MRSU, null если кастомное
    google_event_id = Column(String, nullable=True)  # для upsert в Google Calendar

    user = relationship("User", back_populates="events")


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mrsu_id = Column(Integer, nullable=True)  # id из MRSU для синхронизации
    name = Column(String, nullable=False)
    semester = Column(String, nullable=True)

    control_points = relationship("ControlPoint", back_populates="discipline")
    user = relationship("User", back_populates="disciplines")


class ControlPoint(Base):
    __tablename__ = "control_points"

    id = Column(Integer, primary_key=True, index=True)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)

    title = Column(String, nullable=False)
    type = Column(String, default=ControlPointType.homework)
    deadline = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)       # набранные баллы
    max_score = Column(Float, nullable=True)
    is_submitted = Column(Boolean, default=False)
    is_late = Column(Boolean, nullable=True)   # None = неизвестно
    has_file_upload = Column(Boolean, default=False)
    eios_raw = Column(JSON, nullable=True)
    google_event_id = Column(String, nullable=True)  # если экспортируем дедлайн

    discipline = relationship("Discipline", back_populates="control_points")