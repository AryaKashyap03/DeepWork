from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Response, Cookie
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from schemas import UserResponse
from database import Base, SessionLocal,engine
from models import User, Task, Recipient, HighStakesCommitment, Payment, AuditLog
from starlette import status
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

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
    password: str

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


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def create_user(db: db_dependency, user: UserModel):

    data = db.query(User).filter(User.email == user.email).first()
    if data is None:
        data = user.model_dump()
        password = BcryptContext.hash(data.pop("password"))

        db_user = User(**data, hashed_password = password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return{"User created successfully"}
    else:
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="This email already exists")


@app.post("/auth/login")
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


@app.post("/auth/refresh")
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


@app.get("/profile", response_model=UserResponse)
def get_profile(db: db_dependency, current_user = Depends(get_current_user)):
    return current_user