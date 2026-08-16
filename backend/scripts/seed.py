"""Seed script: creates demo user and demo site for local development."""

import sys
import os

# Ensure parent packages are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import create_tables, engine, User, Site
from app.core.auth import hash_password
from sqlmodel import Session, select


def seed():
    create_tables()

    with Session(engine) as session:
        # Demo user
        existing_user = session.exec(
            select(User).where(User.email == "demo@luminary.dev")
        ).first()

        if not existing_user:
            user = User(
                email="demo@luminary.dev",
                password_hash=hash_password("demo1234"),
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            print(f"[+] Created demo user: demo@luminary.dev (id={user.id})")
        else:
            user = existing_user
            print(f"[=] Demo user already exists (id={user.id})")

        # Demo site
        existing_site = session.exec(
            select(Site).where(Site.site_id == "site_123")
        ).first()

        if not existing_site:
            site = Site(
                user_id=user.id,
                name="Demo Site",
                domain="example.com",
                public_token="demo_public_token",
                site_id="site_123",
            )
            session.add(site)
            session.commit()
            session.refresh(site)
            print(f"[+] Created demo site: {site.name} (site_id={site.site_id}, token={site.public_token})")
        else:
            print(f"[=] Demo site already exists (site_id={existing_site.site_id})")

    print("\n[OK] Seed complete!")
    print("  Login:    demo@luminary.dev / demo1234")
    print("  Site ID:  site_123")
    print("  Token:    demo_public_token")


if __name__ == "__main__":
    seed()
