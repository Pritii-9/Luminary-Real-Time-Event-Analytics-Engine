import unittest
import time
from sqlmodel import SQLModel, create_engine, Session
from app.core.database import EventRecord
from app.services.funnel_service import (
    create_funnel,
    get_funnels_for_site,
    delete_funnel,
    analyze_funnel,
)


class TestFunnelService(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()

    def test_funnel_crud_and_analysis(self):
        steps = [
            {"name": "Landing", "path": "/"},
            {"name": "Pricing", "path": "/pricing"},
            {"name": "Checkout", "path": "/checkout"},
        ]
        funnel = create_funnel(
            user_id=1,
            site_id="site_abc",
            name="Purchase Journey",
            steps=steps,
            session=self.session,
        )
        self.assertIsNotNone(funnel.id)

        # Retrieve funnels
        funnels = get_funnels_for_site("site_abc", user_id=1, session=self.session)
        self.assertEqual(len(funnels), 1)
        self.assertEqual(funnels[0]["name"], "Purchase Journey")

        # Insert test events for 10 sessions visiting Step 1
        now = int(time.time())
        for i in range(10):
            self.session.add(EventRecord(
                event_id=f"e1_{i}",
                site_id="site_abc",
                timestamp=now,
                path="/",
                session_id=f"sess_{i}",
                visitor_id=f"vis_{i}",
            ))
        
        # 6 sessions visiting Step 2 (/pricing)
        for i in range(6):
            self.session.add(EventRecord(
                event_id=f"e2_{i}",
                site_id="site_abc",
                timestamp=now + 10,
                path="/pricing",
                session_id=f"sess_{i}",
                visitor_id=f"vis_{i}",
            ))

        # 3 sessions visiting Step 3 (/checkout)
        for i in range(3):
            self.session.add(EventRecord(
                event_id=f"e3_{i}",
                site_id="site_abc",
                timestamp=now + 20,
                path="/checkout",
                session_id=f"sess_{i}",
                visitor_id=f"vis_{i}",
            ))
        self.session.commit()

        # Perform Funnel Analysis
        analysis = analyze_funnel(funnel.id, days=30, session=self.session)
        self.assertIsNotNone(analysis)
        self.assertEqual(analysis["total_entrants"], 10)
        self.assertEqual(analysis["total_conversions"], 3)
        self.assertEqual(analysis["overall_conversion_rate"], "30.0%")
        self.assertEqual(len(analysis["step_analysis"]), 3)

        # Test deletion
        deleted = delete_funnel(funnel.id, user_id=1, session=self.session)
        self.assertTrue(deleted)


if __name__ == "__main__":
    unittest.main()
