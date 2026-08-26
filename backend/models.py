from sqlalchemy import JSON, CheckConstraint, Column, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
import enum
from database import Base


class TaskType(str,enum.Enum):
    NORMAL = "NORMAL"
    HIGHSTAKES = "HIGH_STAKES"

class TaskStatus(str,enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class CommitmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class PaymentStatus(str, enum.Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class AuditActor(str, enum.Enum):
    USER = "USER"
    SYSTEM = "SYSTEM"
    AGENT = "AGENT"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=True)
    google_id = Column(String(255), nullable=True, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    high_stakes_commitments = relationship("HighStakesCommitment", back_populates="user", cascade="all, delete-orphan")
    recipients = relationship("Recipient", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(Enum(TaskType),nullable=False, default=TaskType.NORMAL)
    deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(TaskStatus) ,nullable=False, default=TaskStatus.PENDING)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("User", back_populates="tasks")
    high_stakes_commitment = relationship(
        "HighStakesCommitment",
        back_populates="task",
        uselist=False,
        cascade="all, delete-orphan",
    )

class Recipient(Base):
    __tablename__ = "recipients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=False)
    razorpay_reference = Column(String(255), nullable=True)
 
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
 
    user = relationship("User", back_populates="recipients")
    commitments = relationship("HighStakesCommitment", back_populates="recipient")
 
    __table_args__ = (
        CheckConstraint("email IS NOT NULL OR phone IS NOT NULL", name="ck_recipient_needs_contact"),
    )
 

class HighStakesCommitment(Base):
    __tablename__ = "high_stakes_commitments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(User.id, ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey(Task.id, ondelete="CASCADE"), nullable=False, index=True, unique=True)
    stake_amount = Column(Numeric(12,2), CheckConstraint('stake_amount >= 50.00 and stake_amount <= 1000.00'), nullable=False)
    currency = Column(String(3), nullable=False, server_default="INR")
    recipient_id = Column(Integer, ForeignKey("recipients.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(Enum(CommitmentStatus), nullable=False, default=CommitmentStatus.DRAFT)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    evaluated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    task = relationship("Task", back_populates="high_stakes_commitment")
    user = relationship("User", back_populates="high_stakes_commitments")
    recipient = relationship("Recipient", back_populates="commitments")
    payment = relationship("Payment", back_populates="commitment", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="commitment")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    commitment_id = Column(
        Integer,
        ForeignKey("high_stakes_commitments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        unique=True
    )
    amount = Column(Numeric(12,2), CheckConstraint('amount >= 50.00 and amount <= 1000.00'), nullable=False)
    currency = Column(String(3), nullable=False, server_default="INR")
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.CREATED)
    razorpay_payment_id = Column(String(255), nullable=True, unique=True, index=True)
    razorpay_order_id = Column(String(255), nullable=True, index=True)
    razorpay_payout_id = Column(String(255), nullable=True, unique=True, index=True)
 
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
 
    commitment = relationship("HighStakesCommitment", back_populates="payment")

class AuditLog(Base):
    __tablename__ = "auditlogs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    commitment_id = Column(
        Integer,
        ForeignKey("high_stakes_commitments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type = Column(String(100), nullable=False, index=True)
    actor = Column(Enum(AuditActor), nullable=False)
    event_metadata = Column("metadata", JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
 
    user = relationship("User", back_populates="audit_logs")
    commitment = relationship("HighStakesCommitment", back_populates="audit_logs")









