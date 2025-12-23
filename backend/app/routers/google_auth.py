from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
import os
from urllib.parse import urlencode

from google_auth_oauthlib.flow import Flow

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"]
REDIRECT_PATH = "/auth/google/callback"
# WARNING: Set your BACKEND_URL in .env (e.g., http://localhost:8000)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
REDIRECT_URI = BACKEND_URL + REDIRECT_PATH

router = APIRouter()


def get_flow():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "project_id": "dummy",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_secret": CLIENT_SECRET,
                "redirect_uris": [REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    return flow


@router.get("/auth/google/url")
async def get_google_auth_url():
    flow = get_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    # Optionally save `state` in session/cookie/db if you validate state in callback
    return {"url": auth_url}


@router.get("/auth/google/callback")
async def google_auth_callback(request: Request, code: str = None, state: str = None, db=Depends(lambda: None), current_user=Depends(lambda: None)):
    """
    code: code from google
    db: get your DB session depending on your architecture
    current_user: retrieve the current user by your dependency (via JWT/session etc)
    """
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No code provided")

    flow = get_flow()
    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        refresh_token = credentials.refresh_token
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch token: {str(e)}")

    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh_token received. Try logging out existing sessions on Google and try again with 'prompt=consent'.")

    # Save refresh_token for current user
    # If you have a User model and DB, you should implement this dependency.
    if not current_user or not db:
        # Please wire your User DB dependency and current_user authentication mechanism
        raise HTTPException(status_code=500, detail="User DB or authentication dependency not implemented.")

    setattr(current_user, "google_refresh_token", refresh_token)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return JSONResponse({"detail": "Google refresh_token saved successfully"})

