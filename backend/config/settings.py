"""
Django settings for the truck routing backend.

Values that change between environments (secret key, debug mode, hosts) are
read from environment variables. Locally they can live in a `.env` file at the
repository root; on Render they are set in the service's dashboard.
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# The backend/ folder; used to build other paths.
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR.parent / ".env")

# Detailed error pages on (local) or off (production); read by Django everywhere.
DEBUG = os.environ.get("DEBUG", "True") == "True"

# Key Django uses to sign data; must be a real secret in production (Render generates it).
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is False.")
    SECRET_KEY = "dev-only-insecure-key"

# Domain names allowed to reach the app; checked by Django on every request.
ALLOWED_HOSTS = [
    host for host in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host
]
# Public hostname Render provides automatically; added to ALLOWED_HOSTS in production.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Active Django modules: Django REST Framework and our trips app.
INSTALLED_APPS = [
    "rest_framework",
    "trips",
]

# Filters every request passes through, in order (security headers, static files, URL cleanup).
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
]

# Module with the root URL table; used by Django to route requests.
ROOT_URLCONF = "config.urls"
# Entry point Gunicorn loads in production.
WSGI_APPLICATION = "config.wsgi.application"

# No database: every request is computed fresh from outside APIs.
DATABASES = {}

# Language and timezone; all dates are handled in UTC.
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_TZ = True

# Folder with the built React app (`npm run build`); served by WhiteNoise.
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
# Serve FRONTEND_DIST files from the site root (/, /assets/...); skipped until the React app is built.
WHITENOISE_ROOT = FRONTEND_DIST if FRONTEND_DIST.exists() else None
# Answer "/" with index.html; used by WhiteNoise.
WHITENOISE_INDEX_FILE = True
# Skip Django's static-file finders (that app isn't installed); used by WhiteNoise.
WHITENOISE_USE_FINDERS = False
# Files under /assets/ have content hashes in their names, so browsers may cache them forever.
WHITENOISE_IMMUTABLE_FILE_TEST = r"^/assets/"

# Key for the GraphHopper API, read from .env locally or Render's settings; used by graphhopper_client.
GRAPHHOPPER_API_KEY = os.environ.get("GRAPHHOPPER_API_KEY", "")
# Base URL of the GraphHopper API; used by graphhopper_client.
GRAPHHOPPER_BASE_URL = "https://graphhopper.com/api/1"

# Django REST Framework: JSON only, no logins, and our own error format.
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "trips.exception_handler.handle_api_exception",
}
