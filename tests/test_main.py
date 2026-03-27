import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_create_user():
    # Use unique email to avoid UNIQUE constraint violations
    unique_email = f"hiker_{uuid.uuid4().hex[:8]}@parks.com"
    payload = {"name": "Hiker John", "email": unique_email}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/api/v1/users", json=payload)
    assert r.status_code == 201
    assert r.json()["name"] == "Hiker John"

