from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from models import CommitmentStatus, TaskStatus, TaskType

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    created_at: datetime
    updated_at: datetime | None

class TaskModel(BaseModel):
    title : str = Field(max_length=255)
    description : str | None = None
    deadline : datetime

class TaskUpdate(BaseModel):
    title: str
    description: str | None = None
    task_type : TaskType
    deadline: datetime

class HighStakesModel(BaseModel):
    title : str = Field(max_length=255)
    description : str | None = None
    deadline : datetime
    stake_amount : Decimal = Field(ge=50.00, le=1000.00)
    recipient_id : int

class RecipientModel(BaseModel):
    name : str
    email : EmailStr
    phone : str = Field(min_length=10, max_length=15)
    razorpay_contact_id : str
    razorpay_fund_account_id : str

class UpdateRecipientModel(BaseModel):
    name : str
    email : EmailStr
    phone : str = Field(min_length=10, max_length=15)
    razorpay_contact_id : str
    razorpay_fund_account_id : str

class HighStakesResponse(BaseModel):
    id: int
    title: str
    description: str | None
    deadline: datetime
    task_status: TaskStatus

    commitment_id: int
    stake_amount: Decimal
    commitment_status: CommitmentStatus
    recipient_id: int

    model_config = ConfigDict(from_attributes=True)

class PaymentVerificationModel(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str