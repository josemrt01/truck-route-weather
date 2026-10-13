#!/usr/bin/env bash
# Render build: compile the React app, pre-compress its files for WhiteNoise,
# and install the Python dependencies.
set -o errexit

cd frontend
npm ci
npm run build
cd ..

pip install -r backend/requirements.txt
python -m whitenoise.compress frontend/dist
