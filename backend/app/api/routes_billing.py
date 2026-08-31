import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlmodel import Session, select
import stripe

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import User, get_session

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "enterprise"

class CheckoutResponse(BaseModel):
    checkout_url: str
    is_mock: bool

class PortalResponse(BaseModel):
    portal_url: str
    is_mock: bool

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    body: CheckoutRequest,
    request: Request,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if body.plan not in ["pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    origin = request.headers.get("origin") or settings.frontend_url or "http://localhost:5173"

    # Mock upgrade flow for easy local testing
    if not settings.stripe_secret_key:
        limit = 100000 if body.plan == "pro" else 1000000
        db_user = session.exec(select(User).where(User.id == user.id)).first()
        if db_user:
            db_user.plan = body.plan
            db_user.subscription_status = "active"
            db_user.monthly_pageview_limit = limit
            session.add(db_user)
            session.commit()
            
            try:
                import asyncio
                from app.core.database import Site
                sites = session.exec(select(Site).where(Site.user_id == user.id)).all()
                for site in sites:
                    from app.services.redis_client import redis_client
                    await asyncio.wait_for(redis_client.delete(f"site_details:{site.site_id}"), timeout=0.5)
                    await asyncio.wait_for(redis_client.delete(f"site_details:{site.public_token}"), timeout=0.5)
            except Exception as e:
                logging.error(f"Error clearing cache: {e}")

        return CheckoutResponse(
            checkout_url=f"{origin}/sites?upgrade=success&plan={body.plan}",
            is_mock=True
        )

    price_id = (
        settings.stripe_pro_price_id
        if body.plan == "pro"
        else settings.stripe_enterprise_price_id
    )

    try:
        db_user = session.exec(select(User).where(User.id == user.id)).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        customer_id = db_user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"user_id": str(user.id)}
            )
            customer_id = customer.id
            db_user.stripe_customer_id = customer_id
            session.add(db_user)
            session.commit()

        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{origin}/sites?upgrade=success&plan={body.plan}",
            cancel_url=f"{origin}/sites?upgrade=cancel",
            metadata={"user_id": str(user.id), "plan": body.plan},
        )
        return CheckoutResponse(checkout_url=checkout_session.url, is_mock=False)
    except Exception as e:
        logging.error(f"Stripe checkout session creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    request: Request,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    origin = request.headers.get("origin") or settings.frontend_url

    if not settings.stripe_secret_key:
        return PortalResponse(
            portal_url=f"{origin}/sites?portal=mock",
            is_mock=True
        )

    db_user = session.exec(select(User).where(User.id == user.id)).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    customer_id = db_user.stripe_customer_id
    if not customer_id:
        try:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"user_id": str(user.id)}
            )
            customer_id = customer.id
            db_user.stripe_customer_id = customer_id
            session.add(db_user)
            session.commit()
        except Exception as e:
            logging.error(f"Failed to dynamically create Stripe customer: {e}")
            raise HTTPException(status_code=400, detail="Could not retrieve or create Stripe customer profile")

    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{origin}/sites",
        )
        return PortalResponse(portal_url=portal_session.url, is_mock=False)
    except Exception as e:
        logging.error(f"Stripe portal session creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create billing portal")


@router.post("/webhook")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
        return Response(status_code=400, content="Stripe webhook not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        return Response(status_code=400, content="Invalid payload")
    except stripe.error.SignatureVerificationError:
        return Response(status_code=400, content="Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = data_object.get("metadata", {}).get("user_id")
        plan = data_object.get("metadata", {}).get("plan", "free")
        sub_id = data_object.get("subscription")
        cust_id = data_object.get("customer")

        if user_id:
            db_user = session.exec(select(User).where(User.id == int(user_id))).first()
            if db_user:
                limit = 100000 if plan == "pro" else 1000000 if plan == "enterprise" else 10000
                db_user.plan = plan
                db_user.subscription_status = "active"
                db_user.stripe_subscription_id = sub_id
                db_user.stripe_customer_id = cust_id
                db_user.monthly_pageview_limit = limit
                session.add(db_user)
                session.commit()
                
                try:
                    from app.core.database import Site
                    sites = session.exec(select(Site).where(Site.user_id == db_user.id)).all()
                    for s in sites:
                        from app.services.redis_client import redis_client
                        await redis_client.delete(f"site_details:{s.site_id}")
                        await redis_client.delete(f"site_details:{s.public_token}")
                except Exception:
                    pass

    elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
        cust_id = data_object.get("customer")
        status = data_object.get("status")

        db_user = session.exec(select(User).where(User.stripe_customer_id == cust_id)).first()
        if db_user:
            if status == "active":
                pass
            else:
                db_user.plan = "free"
                db_user.subscription_status = status
                db_user.monthly_pageview_limit = 10000
                session.add(db_user)
                session.commit()
                
                try:
                    from app.core.database import Site
                    sites = session.exec(select(Site).where(Site.user_id == db_user.id)).all()
                    for s in sites:
                        from app.services.redis_client import redis_client
                        await redis_client.delete(f"site_details:{s.site_id}")
                        await redis_client.delete(f"site_details:{s.public_token}")
                except Exception:
                    pass

    return Response(status_code=200, content="OK")
