from typing import Annotated, Literal
import uuid
from fastapi import Depends, FastAPI, HTTPException, Response, Cookie
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from payout_service import mock_payout_to_recipient
from schemas import HighStakesModel, HighStakesResponse, PaymentVerificationModel, RecipientModel, TaskModel, TaskUpdate, UpdateRecipientModel, UserResponse
from database import Base, SessionLocal,engine
from models import AuditActor, CommitmentStatus, PaymentStatus, TaskStatus, TaskType, User, Task, Recipient, HighStakesCommitment, Payment, AuditLog
from starlette import status
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

from google.oauth2 import id_token
from google.auth.transport import requests

from razorpay_client import razorpay_client
from contextlib import asynccontextmanager
from scheduler import scheduler

from ai_agent import generate_ai_insight

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):

    scheduler.start()

    print("Background scheduler started.")

    yield

    scheduler.shutdown()

    print("Background scheduler stopped.")

app = FastAPI(lifespan=lifespan)

origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = 'HS256'


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
BcryptContext = CryptContext(schemes = ["bcrypt"], deprecated="auto")


class UserModel(BaseModel):
    full_name : str
    email : EmailStr
    password: str = Field(min_length=8)

class GoogleTokenRequest(BaseModel):
    credential: str

def create_access_token(email):
    
    expiry_access_token = datetime.now(timezone.utc)+timedelta(minutes=15)
    data_access = {
        "sub": email,
        "exp" : expiry_access_token,
        "type" : "access"
    }
    encoded_access_jwt = jwt.encode(data_access, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_access_jwt

def create_refresh_token(email):

    expiry_refresh_token = datetime.now(timezone.utc)+timedelta(days = 7)
    data_refresh = {
            "sub": email,
            "exp" : expiry_refresh_token,
            "type" : "refresh"
        }
    encoded_refresh_jwt = jwt.encode(data_refresh, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_refresh_jwt


def get_current_user(db: db_dependency, token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get('sub')

        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED, tags=["Auth Endpoints"])
def create_user(response: Response, db: db_dependency, user: UserModel):

    data = db.query(User).filter(User.email == user.email).first()

    if data is not None:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="This email already exists")
    
    data = user.model_dump()
    password = BcryptContext.hash(data.pop("password"))

    db_user = User(**data, hashed_password = password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    jwt_access_token = create_access_token(db_user.email)
    jwt_refresh_token = create_refresh_token(db_user.email)

    response.set_cookie(
        key="refresh_token",
        value=jwt_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/auth/refresh"
    )

    return{
        "access_token" : jwt_access_token,
        "token_type" : "bearer"
    }


@app.post("/auth/login", tags=["Auth Endpoints"])
def login_user(response: Response,db: db_dependency, user = Depends(OAuth2PasswordRequestForm)):
    data = db.query(User).filter(User.email == user.username).first()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not BcryptContext.verify(user.password, data.hashed_password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Password incorrect")

    jwt_access_token = create_access_token(data.email)
    jwt_refresh_token = create_refresh_token(data.email)

    response.set_cookie(
        key="refresh_token",
        value=jwt_refresh_token,
        httponly=True,
        secure=False,       # Make this true in production
        samesite="lax",
        path="/auth/refresh"
    )

    return{
        "access_token": jwt_access_token,
        "token_type": "bearer"
    }


@app.post("/auth/refresh", tags=["Auth Endpoints"])
def create_new_access_token(db: db_dependency, refresh_token: str | None = Cookie(default=None)):
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        email = payload.get("sub")

        if token_type != "refresh":
            raise JWTError("Invalid token type. A refresh token is required.")
        if email is None:
            raise JWTError("Token payload is missing the subject identifier.")
        
        jwt_access_token = create_access_token(email)
        return {"access_token" : jwt_access_token,
                "token_type" : "bearer"}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")


@app.post("/auth/google", tags=["Auth Endpoints"])
def google_login(
    response: Response,
    db: db_dependency,
    data: GoogleTokenRequest
):
    try:
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID")
        )

        google_id = idinfo["sub"]
        email = idinfo["email"]
        full_name = idinfo.get("name", "Google User")
        email_verified = idinfo.get("email_verified", False)

        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google email is not verified"
            )

        # 1. Look for an existing Google account
        user = db.query(User).filter(User.google_id == google_id).first()

        # 2. If Google account doesn't exist, look for matching email
        if user is None:
            user = db.query(User).filter(User.email == email).first()

            # Existing local account → link Google account
            if user is not None:
                user.google_id = google_id
                db.commit()
                db.refresh(user)

            # Completely new user → create account
            else:
                user = User(
                    email=email,
                    full_name=full_name,
                    google_id=google_id,
                    hashed_password=None
                )

                db.add(user)
                db.commit()
                db.refresh(user)

        # 3. User now exists → issue YOUR JWTs
        jwt_access_token = create_access_token(user.email)
        jwt_refresh_token = create_refresh_token(user.email)

        response.set_cookie(
            key="refresh_token",
            value=jwt_refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            path="/auth/refresh"
        )

        return {
            "access_token": jwt_access_token,
            "token_type": "bearer"
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token"
        )

@app.post("/auth/logout", tags=["Auth Endpoints"])
def logout_user(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/auth/refresh"
    )

    return {"message": "Logged out successfully"}

@app.get("/profile", response_model=UserResponse, tags=["Get Profile Endpoint"])
def get_profile(db: db_dependency, current_user = Depends(get_current_user)):
    return current_user


@app.post("/tasks", tags=["Normal Task Endpoints"])
def create_task(db: db_dependency, task: TaskModel, current_user = Depends(get_current_user)):
    user_task = task.model_dump()
    user_task["status"] = TaskStatus.IN_PROGRESS
    data = Task(**user_task)
    current_user.tasks.append(data)
    db.commit()
    db.refresh(data)
    return data


@app.get("/tasks", tags=["Normal Task Endpoints"])
def get_all_tasks_or_by_type(db: db_dependency, type: TaskType | None = None , current_user = Depends(get_current_user)):
    data = db.query(Task).filter(Task.user_id == current_user.id)

    if type is None:
        return data.all()

    data = data.filter(Task.task_type == type)
    return data.all()



@app.get("/tasks/{task_id}", tags=["Normal Task Endpoints"])
def get_task_by_id(task_id : int, db: db_dependency ,current_user = Depends(get_current_user)):
    data = db.query(Task).filter(Task.user_id == current_user.id, Task.id == task_id).first()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return data


@app.patch("/tasks/{task_id}", tags=["Normal Task Endpoints"])
def patch_task_by_id(task_id : int, db : db_dependency, taskupdate: TaskUpdate, current_user = Depends(get_current_user)):
    data = db.query(Task).filter(Task.user_id == current_user.id, Task.id == task_id).first()

    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.task_type == "NORMAL" and taskupdate.task_type == "NORMAL":
        data.title = taskupdate.title
        data.description = taskupdate.description
        data.deadline = taskupdate.deadline
        db.commit()
        db.refresh(data)
        return data

    if data.task_type == "NORMAL" and taskupdate.task_type == "HIGH_STAKES":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Task type cannot be updated to high stakes. Create a new high stakes task.")

    if data.task_type == "HIGH_STAKES" and taskupdate.task_type == "NORMAL":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="High stakes task cannot be changed to a normal task once created.")

    if data.task_type == "HIGH_STAKES" and taskupdate.task_type == "HIGH_STAKES":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="High stakes cannot be updated.")

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter valid info.")


@app.delete("/tasks/{task_id}", tags=["Normal Task Endpoints"])
def delete_task_by_id(task_id: int, db: db_dependency, current_user = Depends(get_current_user)):
    data = db.query(Task).filter(Task.user_id == current_user.id, Task.id == task_id).first()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if data.task_type == TaskType.HIGHSTAKES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="High Stakes task cannot be deleted")

    db.delete(data)
    db.commit()


@app.post("/tasks/{task_id}/complete", tags=["Normal Task Endpoints"])   
def complete_task(task_id: int, db: db_dependency, current_user = Depends(get_current_user)):
    data = db.query(Task).filter(Task.user_id == current_user.id, Task.id == task_id).first()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task already completed")

    now = datetime.now(timezone.utc)
    data.evaluated_at = now
    deadline = data.deadline

    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    if now <= deadline:
        data.status = "COMPLETED"
        db.commit()
        db.refresh(data)
        return data

    data.status = "FAILED"
    db.commit()
    db.refresh(data)
    return data
    


@app.post("/highstakes/recipient", tags=["Recipient Endpoints"])
def create_recipient(recipient: RecipientModel, db : db_dependency, current_user = Depends(get_current_user)):
    data = recipient.model_dump()
    data["email"] = str(data["email"])
    data["user_id"] = current_user.id
    new_recipient = Recipient(**data)
    db.add(new_recipient)
    db.commit()
    db.refresh(new_recipient)
    return new_recipient


@app.put("/highstakes/recipient/{recipient_id}", tags=["Recipient Endpoints"])
def update_recipient(recipient: UpdateRecipientModel, recipient_id : int , db : db_dependency, current_user = Depends(get_current_user)):
    data = db.query(Recipient).filter(Recipient.user_id == current_user.id, Recipient.id == recipient_id).first()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
    data.name = recipient.name
    data.email = recipient.email
    data.phone = recipient.phone
    data.razorpay_reference = recipient.razorpay_reference
    db.commit()
    db.refresh(data)


@app.delete("/highstakes/recipient/{recipient_id}", tags=["Recipient Endpoints"])
def delete_recipient(recipient_id : int, db : db_dependency, current_user = Depends(get_current_user)):
    data = db.query(Recipient).filter(Recipient.user_id == current_user.id, Recipient.id == recipient_id).first()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
    db.delete(data)
    db.commit()


@app.get("/highstakes/recipients", tags=["Recipient Endpoints"])
def get_recipients(db : db_dependency, current_user = Depends(get_current_user)):
    data = db.query(Recipient).filter(Recipient.user_id == current_user.id).all()
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No recipients found.")
    return data
     

@app.post("/highstakes", status_code=status.HTTP_201_CREATED, tags=["High Stakes Task Endpoints"])
def create_highstake_task(task: HighStakesModel, db: db_dependency, current_user = Depends(get_current_user)):
    recipient = db.query(Recipient).filter(Recipient.id == task.recipient_id, Recipient.user_id == current_user.id).first()

    if recipient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    normal_task = Task(
        user_id = current_user.id,
        title = task.title,
        description = task.description,
        deadline = task.deadline,
        task_type = "HIGH_STAKES"
    )

    commitment = HighStakesCommitment(
        user_id = current_user.id,
        stake_amount = task.stake_amount,
        recipient_id = task.recipient_id
    )

    normal_task.high_stakes_commitment = commitment
    db.add(normal_task)
    db.commit()
    db.refresh(normal_task)
    db.refresh(commitment)
    return {
        "task_id": normal_task.id,
        "commitment_id": commitment.id
    }

@app.get("/highstakes", response_model=list[HighStakesResponse], tags=["High Stakes Task Endpoints"])
def get_highstakes(db: db_dependency, current_user=Depends(get_current_user)):

    tasks = db.query(Task).filter(Task.user_id == current_user.id, Task.task_type == TaskType.HIGHSTAKES).all()

    if tasks is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="High stakes tasks not found")

    result = []

    for task in tasks:
        commitment = task.high_stakes_commitment

        result.append({
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "deadline": task.deadline,
            "task_status": task.status,
            "commitment_id": commitment.id,
            "stake_amount": commitment.stake_amount,
            "commitment_status": commitment.status,
            "recipient_id": commitment.recipient_id,
        })

    return result

@app.get("/highstakes/{id}", tags=["High Stakes Task Endpoints"])
def get_highstake_by_id(id : int ,db: db_dependency, current_user=Depends(get_current_user)):
    task = db.query(Task).filter(Task.user_id == current_user.id, Task.task_type == TaskType.HIGHSTAKES, Task.id == id).first()
    
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="High stakes task not found")

    commitment = task.high_stakes_commitment

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "deadline": task.deadline,
        "task_status": task.status,
        "commitment_id": commitment.id,
        "stake_amount": commitment.stake_amount,
        "commitment_status": commitment.status,
        "recipient_id": commitment.recipient_id,
    }


def create_payment(commitment, db):
    data = commitment.payment
    if data is not None:
        return None

    razorpay_order = razorpay_client.order.create({
        "amount": int(commitment.stake_amount * 100),
        "currency": commitment.currency,
        "receipt": f"commitment_{commitment.id}",
        "notes": {
            "commitment_id": str(commitment.id)
        }
    })

    payment = Payment(
        commitment_id=commitment.id,
        amount=commitment.stake_amount,
        currency=commitment.currency,
        status=PaymentStatus.CREATED,
        razorpay_order_id=razorpay_order["id"]
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@app.post("/highstakes/{id}/confirm", tags=["High Stakes Task Endpoints"])
def confirm_highstake_task(id : int ,db: db_dependency, current_user=Depends(get_current_user)):

    task = db.query(Task).filter(Task.user_id == current_user.id, Task.task_type == TaskType.HIGHSTAKES, Task.id == id).first()
        
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="High stakes task not found")

    commitment = task.high_stakes_commitment

    if commitment.status != CommitmentStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Commitment is no longer in draft state.")

    payment = create_payment(commitment, db)

    if payment is None:
        payment = commitment.payment

    return {
        "message": "Payment initialized successfully.",
        "payment_id": payment.id,
        "razorpay_order_id": payment.razorpay_order_id,
        "amount": int(payment.amount * 100),
        "currency": payment.currency
    }

@app.post("/highstakes/payments/verify", tags=["High Stakes Task Endpoints"])
def verify_payment(payment_data: PaymentVerificationModel, db: db_dependency, current_user=Depends(get_current_user)):
    payment = db.query(Payment).filter(Payment.razorpay_order_id == payment_data.razorpay_order_id).first()

    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    commitment = payment.commitment

    if commitment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to verify this payment")

    razorpay_client.utility.verify_payment_signature({
    "razorpay_order_id": payment_data.razorpay_order_id,
    "razorpay_payment_id": payment_data.razorpay_payment_id,
    "razorpay_signature": payment_data.razorpay_signature
    })
    if payment.status == PaymentStatus.SUCCESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment already verified")
    
    payment.status = PaymentStatus.SUCCESS

    payment.razorpay_payment_id = payment_data.razorpay_payment_id

    commitment = payment.commitment
    task = commitment.task

    commitment.status = CommitmentStatus.ACTIVE
    commitment.locked_at = datetime.now(timezone.utc)

    task.status = TaskStatus.IN_PROGRESS
    db.commit()
    return {
            "message": "Payment verified successfully.",
            "payment_id": payment.id,
            "commitment_id": commitment.id,
            "status": payment.status
        }


def refund_payment(payment, db):
    if payment.status == PaymentStatus.REFUNDED:
        return None

    if payment.status != PaymentStatus.SUCCESS:
        return None
    
    refund = razorpay_client.payment.refund(
        payment.razorpay_payment_id,
        {
            "amount": int(payment.amount * 100),
            "notes": {
                "reason": "High stakes task completed"
            }
        }
    )
    payment.razorpay_refund_id = refund["id"]
    payment.status = PaymentStatus.REFUNDED

    db.commit()
    db.refresh(payment)

    return payment



@app.post("/highstakes/{id}/complete", tags=["High Stakes Task Endpoints"])
def mark_highstake_task_complete(id: int, db: db_dependency, current_user=Depends(get_current_user)):

    task = (
        db.query(Task)
        .filter(
            Task.user_id == current_user.id,
            Task.task_type == TaskType.HIGHSTAKES,
            Task.id == id
        )
        .first()
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="High stakes task not found"
        )

    commitment = task.high_stakes_commitment

    if commitment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Commitment not found"
        )

    payment = commitment.payment

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment found for this commitment"
        )

    now = datetime.now(timezone.utc)

    deadline = task.deadline

    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    task.evaluated_at = now
    commitment.evaluated_at = now

    if commitment.status != CommitmentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Commitment is not active."
        )

    # ==========================================
    # FAILURE CASE
    # ==========================================

    if now > deadline:

        commitment.status = CommitmentStatus.FAILED
        task.status = TaskStatus.FAILED

        payout = mock_payout_to_recipient(payment)

        db.commit()

        db.refresh(task)
        db.refresh(commitment)
        db.refresh(payout)

        return {
            "message": "Task failed. Stake transferred to recipient.",
            "task_status": task.status,
            "commitment_status": commitment.status,
            "payment_status": payout.status,
            "payout_id": payout.razorpay_payout_id
        }

    # ==========================================
    # SUCCESS CASE
    # ==========================================

    refunded_payment = refund_payment(payment, db)

    if refunded_payment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment either already refunded or "
                "initial payment was not successful"
            )
        )

    commitment.status = CommitmentStatus.COMPLETED
    task.status = TaskStatus.COMPLETED

    db.commit()

    db.refresh(task)
    db.refresh(commitment)
    db.refresh(refunded_payment)

    return {
        "message": "Task completed successfully. Payment refunded.",
        "task_status": task.status,
        "commitment_status": commitment.status,
        "payment_status": refunded_payment.status,
        "refund_id": refunded_payment.razorpay_refund_id
    }


@app.get("/highstakes/{id}/payment", tags=["Payment endpoint"])
def get_payment_info(id: int, db: db_dependency ,current_user = Depends(get_current_user)):
    commitment = db.query(HighStakesCommitment).filter(HighStakesCommitment.id == id, HighStakesCommitment.user_id == current_user.id).first()

    if commitment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="High stake task not found")

    payment = commitment.payment
    if payment is None:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="No payment associated with this commitment yet")
    
    return payment
    

# ============================================================
# AI INSIGHT
# ============================================================

class AIInsightRequest(BaseModel):
    period: Literal[
        "THIS_WEEK",
        "LAST_WEEK",
        "TWO_WEEKS_AGO",
        "THIS_MONTH",
        "ALL_TIME"
    ] = "THIS_WEEK"


@app.post("/ai/insight", tags=["AI"])
def get_ai_insight(
    request: AIInsightRequest,
    db: db_dependency,
    current_user=Depends(get_current_user)
):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .all()
    )

    return generate_ai_insight(
        tasks,
        request.period
    )