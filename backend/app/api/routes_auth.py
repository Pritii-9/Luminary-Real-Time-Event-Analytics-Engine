"""Auth API routes: register, login, logout, me, verify-otp, resend-otp."""

import random
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session as SQLSession, select

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.database import User, get_session
from app.services.redis_client import redis_client
from app.services.email_service import send_otp_email

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class ResendOTPRequest(BaseModel):
    email: str


class UserResponse(BaseModel):
    id: int
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    detail: str


@router.post("/register", response_model=MessageResponse)
async def register(body: RegisterRequest, session: SQLSession = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=409, detail="Email already registered")
        # Existing but unverified: update password in case they changed it
        existing.password_hash = hash_password(body.password)
        session.add(existing)
        session.commit()
    else:
        # Create unverified user
        user = User(email=body.email, password_hash=hash_password(body.password), is_verified=False)
        session.add(user)
        session.commit()

    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"

    # Save OTP to Redis (expires in 5 minutes)
    await redis_client.set(f"otp:{body.email}", otp, ex=300)

    # Send email (prints to console in development)
    send_otp_email(body.email, otp)

    return MessageResponse(detail="Verification OTP sent to email")


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(body: VerifyOTPRequest, response: Response, session: SQLSession = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check OTP in Redis
    stored_otp = await redis_client.get(f"otp:{body.email}")
    if not stored_otp:
        raise HTTPException(status_code=400, detail="OTP expired or not found")

    if stored_otp != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    # Mark user as verified
    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)

    # Delete OTP from Redis
    await redis_client.delete(f"otp:{body.email}")

    # Generate access token
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


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(body: ResendOTPRequest, session: SQLSession = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    # Generate new OTP
    otp = f"{random.randint(100000, 999999)}"
    await redis_client.set(f"otp:{body.email}", otp, ex=300)
    send_otp_email(body.email, otp)

    return MessageResponse(detail="Verification OTP resent successfully")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, session: SQLSession = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email verification required")

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
