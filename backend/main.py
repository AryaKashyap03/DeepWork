from typing import Annotated, Literal
from fastapi import Depends, FastAPI, HTTPException, Response, Cookie
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from schemas import HighStakesModel, HighStakesResponse, RecipientModel, TaskModel, TaskUpdate, UpdateRecipientModel, UserResponse
from database import Base, SessionLocal,engine
from models import CommitmentStatus, PaymentStatus, TaskStatus, TaskType, User, Task, Recipient, HighStakesCommitment, Payment, AuditLog
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

load_dotenv()

app = FastAPI()

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

    data.status = "COMPLETED"
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
    return commitment

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
    now = datetime.now(timezone.utc)

    if commitment.status == CommitmentStatus.DRAFT:
        payment = create_payment(commitment, db)
        if payment is not None:
            commitment.status = CommitmentStatus.ACTIVE
            commitment.locked_at = now
            task.status = TaskStatus.IN_PROGRESS
            db.commit()
            db.refresh(task)
            db.refresh(commitment)
            return commitment.payment
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment already created for this commitment")

    if commitment.status == CommitmentStatus.ACTIVE:
        if commitment.payment is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Setup payment first")
        else:
            return commitment.payment


@app.post("/highstakes/{id}/complete", tags=["High Stakes Task Endpoints"])
def mark_highstake_task_complete(id : int ,db: db_dependency, current_user=Depends(get_current_user)):

    task = db.query(Task).filter(Task.user_id == current_user.id, Task.task_type == TaskType.HIGHSTAKES, Task.id == id).first()
            
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="High stakes task not found")

    commitment = task.high_stakes_commitment
    now = datetime.now(timezone.utc)

    if commitment.status == CommitmentStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Task is already completed")

    if now > task.deadline and commitment.status != CommitmentStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail = "Time is up. Task status cannot be changed now.")

    if now <= task.deadline:
        commitment.status = CommitmentStatus.COMPLETED
        task.status = TaskStatus.COMPLETED
        commitment.evaluated_at = now

        db.commit()
        db.refresh(task)
        db.refresh(commitment)
        return {"message" : "Task completed successfully before time. Payment aborted."}


@app.post("/highstakes/{id}/evaluate", tags=["High Stakes Task Endpoints"])
def evaluate_highstake_task(id : int ,db: db_dependency, current_user=Depends(get_current_user)):
    task = db.query(Task).filter(Task.user_id == current_user.id, Task.task_type == TaskType.HIGHSTAKES, Task.id == id).first()
                
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="High stakes task not found")

    commitment = task.high_stakes_commitment
    now = datetime.now(timezone.utc)

    if commitment.status == CommitmentStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail = "Task is already completed")

    if now > task.deadline and task.status != TaskStatus.COMPLETED and commitment.status != CommitmentStatus.COMPLETED:
        commitment.status = CommitmentStatus.FAILED
        task.status = TaskStatus.FAILED
        commitment.evaluated_at = now

        db.commit()

        # Financial consequence will eventually happen here

        return {
            "message": "Task failed. Deadline passed without completion."
        }

@app.get("/highstakes/{id}/payment", tags=["Payment endpoint"])
def get_payment_info(id: int, current_user = Depends(get_current_user)):
    return current_user.high_stakes_commitments.payment
    




    

