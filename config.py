import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./park_tracker.db")

# App settings
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
API_TITLE = "National Park Tracker"
API_VERSION = "1.0.0"
