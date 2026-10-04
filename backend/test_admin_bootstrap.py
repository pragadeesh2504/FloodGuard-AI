import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User
from app.models.location import Location
from app.models.shelter import Shelter
from app.utils.security import verify_password, create_access_token
from app.config import settings

# Use an isolated in-memory SQLite database for bootstrap testing
TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def test_db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def run_seed_on_db(db):
    """Executes the exact database seeding logic from app.main.seed_database on a target db session."""
    from app.utils.security import get_password_hash
    import secrets

    # 1. Seed Locations
    if db.query(Location).count() == 0:
        loc = Location(name="Chennai", latitude=13.0827, longitude=80.2707, elevation=6.0, distance_from_river=150.0, population_density=26553, historical_flood_frequency=0.85)
        db.add(loc)
        db.commit()

    # 2. Seed Shelters
    if db.query(Shelter).count() == 0:
        sh = Shelter(name="Test Shelter", latitude=13.09, longitude=80.26, capacity=100, current_occupancy=0, contact_number="+91-000", status="Open", amenities="Food")
        db.add(sh)
        db.commit()

    # 3. Seed Admin
    bootstrap_pwd = None
    if db.query(User).filter(User.role == "admin").count() == 0:
        admin_username = settings.ADMIN_USERNAME or "admin"
        admin_email = settings.ADMIN_EMAIL or "admin@floodguard.gov.in"

        if settings.ADMIN_INITIAL_PASSWORD and settings.ADMIN_INITIAL_PASSWORD.strip():
            admin_password = settings.ADMIN_INITIAL_PASSWORD.strip()
            admin_user = User(
                username=admin_username,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
        else:
            bootstrap_password = secrets.token_urlsafe(24)
            bootstrap_pwd = bootstrap_password
            admin_user = User(
                username=admin_username,
                email=admin_email,
                hashed_password=get_password_hash(bootstrap_password),
                role="admin"
            )
            db.add(admin_user)
            db.commit()

    return bootstrap_pwd


def test_admin_creation_with_configured_env_password(test_db, monkeypatch):
    """Verify admin creation when ADMIN_INITIAL_PASSWORD is provided via environment."""
    test_password = "SecureCustomEnvPassword_2026!"
    monkeypatch.setattr(settings, "ADMIN_INITIAL_PASSWORD", test_password)

    bootstrap_token = run_seed_on_db(test_db)
    assert bootstrap_token is None, "No bootstrap token should be generated when password is provided"

    admin = test_db.query(User).filter(User.role == "admin").first()
    assert admin is not None
    assert admin.username == "admin"
    assert admin.email == "admin@floodguard.gov.in"

    # Plaintext password is NEVER stored
    assert admin.hashed_password != test_password
    assert admin.hashed_password.startswith("$2b$")

    # Hash correctly validates password for login
    assert verify_password(test_password, admin.hashed_password) is True
    assert verify_password("WrongPassword123", admin.hashed_password) is False


def test_admin_creation_with_generated_bootstrap_token(test_db, monkeypatch):
    """Verify admin creation when ADMIN_INITIAL_PASSWORD is empty generates secure random token."""
    monkeypatch.setattr(settings, "ADMIN_INITIAL_PASSWORD", "")

    bootstrap_token = run_seed_on_db(test_db)
    assert bootstrap_token is not None
    assert len(bootstrap_token) >= 24, "Bootstrap token must be cryptographically long (>=24 chars)"

    admin = test_db.query(User).filter(User.role == "admin").first()
    assert admin is not None

    # Plaintext token is NEVER stored in database
    assert admin.hashed_password != bootstrap_token
    assert admin.hashed_password.startswith("$2b$")

    # Token works for password verification / login
    assert verify_password(bootstrap_token, admin.hashed_password) is True
    assert verify_password("arbitrary_wrong_token", admin.hashed_password) is False


def test_no_admin_recreation_if_admin_already_exists(test_db, monkeypatch):
    """Verify that existing admin is NOT overwritten or duplicated on subsequent runs."""
    original_password = "FirstRunAdminPassword_999!"
    monkeypatch.setattr(settings, "ADMIN_INITIAL_PASSWORD", original_password)
    run_seed_on_db(test_db)

    admin_first = test_db.query(User).filter(User.role == "admin").first()
    first_hash = admin_first.hashed_password

    # Second startup attempt with a DIFFERENT environment password
    monkeypatch.setattr(settings, "ADMIN_INITIAL_PASSWORD", "DifferentPassword_000!")
    bootstrap_token_second = run_seed_on_db(test_db)

    # Should not produce a bootstrap token, should not duplicate user, should preserve original hash
    assert bootstrap_token_second is None
    admin_count = test_db.query(User).filter(User.role == "admin").count()
    assert admin_count == 1

    admin_after = test_db.query(User).filter(User.role == "admin").first()
    assert admin_after.hashed_password == first_hash
    assert verify_password(original_password, admin_after.hashed_password) is True
    assert verify_password("DifferentPassword_000!", admin_after.hashed_password) is False


def test_repeated_startup_idempotency(test_db, monkeypatch):
    """Verify repeated invocations without env password do not regenerate or alter admin."""
    monkeypatch.setattr(settings, "ADMIN_INITIAL_PASSWORD", "")
    token1 = run_seed_on_db(test_db)
    assert token1 is not None

    token2 = run_seed_on_db(test_db)
    token3 = run_seed_on_db(test_db)

    assert token2 is None, "Subsequent runs must not generate new bootstrap passwords"
    assert token3 is None, "Subsequent runs must not generate new bootstrap passwords"

    assert test_db.query(User).filter(User.role == "admin").count() == 1
