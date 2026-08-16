"""Auth API routes: register, login, logout, me."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session as SQLSession, select

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.database import User, get_session


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, session: SQLSession = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, session: SQLSession = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id, user.email)

    # Also set HTTP-only cookie for browser convenience
    response.set_cookie(
        key="luminary_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email),
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("luminary_token")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, email=user.email)
