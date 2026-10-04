import sys
import os
import sqlite3

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from app.database import Base, engine
import app.models

Base.metadata.create_all(bind=engine)

conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), 'floodguard.db'))
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print('Existing and new tables:', tables)

for t in ['users', 'locations', 'shelters', 'weather_readings', 'predictions', 'citizen_reports', 'alerts', 'incidents', 'audit_logs']:
    cur.execute(f"SELECT count(*) FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]}")

conn.close()
