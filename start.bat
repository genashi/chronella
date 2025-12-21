@echo off
title Chronella Runner

echo [1/2] Starting FastAPI Backend...
start cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo [2/2] Starting React Frontend...
start cmd /k "cd frontend && npm run dev"

echo Done! Backend is on port 8000, Frontend is on 5173.
pause