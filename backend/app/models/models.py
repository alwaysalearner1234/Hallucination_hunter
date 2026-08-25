import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean,
    ForeignKey, DateTime, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guest_id = Column(String(64), unique=True, index=True)
    email = Column(String(255), unique=True)
    hashed_password = Column(String(255))
    is_guest = Column(Boolean, default=True)
    preferences = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    sessions = relationship("VerificationSession", back_populates="user")


class VerificationSession(Base):
    __tablename__ = "verification_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    input_text = Column(Text, nullable=False)
    source_type = Column(String(50), default="paste")
    mode = Column(String(20), default="standard")
    trust_score = Column(Integer)
    total_claims = Column(Integer, default=0)
    verified_count = Column(Integer, default=0)
    false_count = Column(Integer, default=0)
    unverifiable_count = Column(Integer, default=0)
    status = Column(String(30), default="pending")
    error_message = Column(Text)
    ocr_confidence = Column(Float)
    verified_answer = Column(Text)
    processing_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="sessions")
    claims = relationship("Claim", back_populates="session", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="session", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False)
    claim_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    claim_type = Column(String(50))
    importance = Column(String(20))
    verdict = Column(String(20))
    confidence = Column(Integer)
    severity = Column(String(20))
    reasoning = Column(Text)
    correction = Column(Text)
    correction_evidence = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("VerificationSession", back_populates="claims")
    evidence = relationship("Evidence", back_populates="claim", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="claim", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(Text, unique=True, nullable=False)
    title = Column(Text)
    publisher = Column(Text)
    published_at = Column(DateTime(timezone=True))
    retrieved_at = Column(DateTime(timezone=True), default=utcnow)
    source_type = Column(String(50))
    quality_score = Column(Integer)
    quality_reasons = Column(JSONB, default=list)

    evidence = relationship("Evidence", back_populates="source")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    snippet = Column(Text, nullable=False)
    relevance_score = Column(Float)
    supports_claim = Column(Boolean)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    claim = relationship("Claim", back_populates="evidence")
    source = relationship("Source", back_populates="evidence")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("verification_sessions.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    input_summary = Column(Text)
    output_summary = Column(Text)
    duration_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("VerificationSession", back_populates="agent_runs")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    feedback_type = Column(String(30), nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    claim = relationship("Claim", back_populates="feedback")
