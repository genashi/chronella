# Chronella AI Coding Instructions

## Project Overview
Chronella is a student productivity application that integrates MRSU (university) academic performance data with personal activity planning. It features user authentication, account linking to external services, and a clean Material Design 3 interface.

## Architecture
- **Backend**: Python FastAPI with SQLAlchemy ORM and SQLite database
- **Frontend**: React 19 + TypeScript + Vite + Material-UI (MUI) + React Router
- **Database**: SQLite (`database.db` in backend/)
- **Authentication**: JWT tokens stored in localStorage, OAuth2PasswordBearer
- **CORS**: Configured for React (localhost:3000) to communicate with FastAPI (localhost:8000)

## Key Components
- **Backend**: `main.py` (FastAPI app), `app/models.py` (User model), `app/database.py` (SQLAlchemy setup), `app/services/mrsu.py` (MRSU API integration)
- **Frontend**: `App.tsx` (theme + routing), `pages/LoginPage.tsx`, `RegistrationPage.tsx`, `SetupPage.tsx` (stepper for account linking)

## Developer Workflows
- **Backend**: Activate venv (`.\venv\Scripts\Activate`), run `uvicorn main:app --reload --port 8000`
- **Frontend**: `npm run dev` (starts on localhost:5173, proxies to backend)
- **Database**: Auto-created on first run via `models.Base.metadata.create_all()`
- **Dependencies**: Backend `pip freeze > requirements.txt`, Frontend standard npm scripts

## API Patterns
- Endpoints: `/auth/login`, `/auth/register`, `/auth/profile`, `/auth/link-mrsu`
- Login uses `application/x-www-form-urlencoded` with URLSearchParams
- Other requests use `application/json`
- Auth headers: `Authorization: Bearer {token}` from localStorage

## UI/UX Conventions
- **Theme**: Custom Material Design 3 with primary `#536525` (green), background `#fafaee`
- **Language**: Russian UI text and comments
- **Navigation**: React Router with protected routes
- **Forms**: MUI components with validation, loading states, and error handling
- **Stepper**: Used in SetupPage for multi-step account linking process

## Integration Points
- **MRSU API**: Student performance data from p.mrsu.ru (login/password required)
- **Google**: Planned integration for calendar/planning features
- **External APIs**: Use fetch with proper error handling and loading states

## Code Patterns
- Backend models inherit from `Base` in `database.py`
- Frontend uses `const API_URL = 'http://localhost:8000'` for API calls
- Theme defined in `App.tsx` with CSS variables for MD3 colors
- Error handling: Try/catch with user-friendly Russian messages
- State management: React hooks (useState, useEffect) for component state

## Development Notes
- Always test CORS when adding new endpoints
- Update `requirements.txt` after adding backend dependencies
- Use MUI theme colors instead of hardcoded values
- Follow Russian naming conventions for UI strings
- Database migrations not implemented - recreate `database.db` for schema changes