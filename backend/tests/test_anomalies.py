import unittest
import time
from sqlmodel import SQLModel, create_engine, Session
from app.core.database import EventRecord
from app.services.anomaly_service import detect_traffic_anomalies


class TestAnomalyService(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()

    def test_detect_anomalies_empty(self):
        result = detect_traffic_anomalies("test_site", days=7, session=self.session)
        self.assertIn("status", result)
        self.assertEqual(result["status"], "NORMAL")
        self.assertEqual(result["z_score"], 0.0)

    def test_detect_anomalies_normal_traffic(self):
        now = int(time.time())
        # Insert baseline hourly traffic (10 events per hour for past 10 hours)
        for h in range(10):
            ts = now - (h * 3600)
            for i in range(10):
                self.session.add(EventRecord(
                    event_id=f"e_{h}_{i}",
                    site_id="test_site",
                    timestamp=ts,
                    path="/home",
                    session_id=f"s_{h}_{i}",
                    visitor_id=f"v_{h}_{i}",
                ))
        self.session.commit()

        result = detect_traffic_anomalies("test_site", days=7, session=self.session)
        self.assertIn(result["status"], ["NORMAL", "SPIKE_WARNING"])
        self.assertIn("z_score", result)

    def test_detect_anomalies_spike_detected(self):
        now = int(time.time())
        # Baseline: 5 events per hour for past 10 hours
        for h in range(1, 10):
            ts = now - (h * 3600)
            for i in range(5):
                self.session.add(EventRecord(
                    event_id=f"e_{h}_{i}",
                    site_id="test_site",
                    timestamp=ts,
                    path="/home",
                    session_id=f"s_{h}_{i}",
                    visitor_id=f"v_{h}_{i}",
                ))

        # Current hour: 100 events (massive surge)
        for i in range(100):
            self.session.add(EventRecord(
                event_id=f"e_spike_{i}",
                site_id="test_site",
                timestamp=now,
                path="/home",
                session_id=f"s_spike_{i}",
                visitor_id=f"v_spike_{i}",
            ))
        self.session.commit()

        result = detect_traffic_anomalies("test_site", days=7, session=self.session)
        self.assertIn(result["status"], ["SPIKE_WARNING", "SPIKE_CRITICAL"])
        self.assertGreater(result["z_score"], 2.0)


if __name__ == "__main__":
    unittest.main()
