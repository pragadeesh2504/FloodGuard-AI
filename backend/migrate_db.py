import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'floodguard.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check citizen_reports columns
cur.execute('PRAGMA table_info(citizen_reports)')
cols = [r[1] for r in cur.fetchall()]
print('Current citizen_reports columns:', cols)

if 'category' not in cols:
    cur.execute("ALTER TABLE citizen_reports ADD COLUMN category VARCHAR DEFAULT 'waterlogging'")
    print('Added category column')

if 'verification_status' not in cols:
    cur.execute("ALTER TABLE citizen_reports ADD COLUMN verification_status VARCHAR DEFAULT 'NEW'")
    print('Added verification_status column')

if 'verified_by' not in cols:
    cur.execute("ALTER TABLE citizen_reports ADD COLUMN verified_by VARCHAR")
    print('Added verified_by column')

if 'verified_at' not in cols:
    cur.execute("ALTER TABLE citizen_reports ADD COLUMN verified_at DATETIME")
    print('Added verified_at column')

# Update verification_status for previously verified reports
cur.execute("UPDATE citizen_reports SET verification_status = 'VERIFIED' WHERE is_verified = 1 AND (verification_status IS NULL OR verification_status = 'NEW')")

conn.commit()

# Re-check columns
cur.execute('PRAGMA table_info(citizen_reports)')
new_cols = [r[1] for r in cur.fetchall()]
print('Updated citizen_reports columns:', new_cols)

cur.execute('SELECT count(*) FROM citizen_reports')
print('citizen_reports count after migration:', cur.fetchone()[0])
conn.close()
