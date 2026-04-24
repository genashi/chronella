from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os

def get_google_service(refresh_token: str):
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )
    return build("calendar", "v3", credentials=creds)


def ensure_chronella_calendar(service) -> str:
    """Находит или создаёт календарь Chronella, возвращает его id."""
    calendars = service.calendarList().list().execute()
    for cal in calendars.get("items", []):
        if cal.get("summary") == "Chronella":
            return cal["id"]
    created = service.calendars().insert(body={
        "summary": "Chronella",
        "timeZone": "Europe/Moscow"
    }).execute()
    return created["id"]


def event_to_google(event, calendar_id: str) -> dict:
    """Конвертирует Event в формат Google Calendar."""
    is_deadline = event.type == "deadline"

    if is_deadline:
        # Дедлайн — событие на весь день
        date_str = event.start_at.strftime("%Y-%m-%d")
        return {
            "summary": f"🔴 {event.title}",
            "start": {"date": date_str},
            "end": {"date": date_str},
            "colorId": "11",  # красный
            "description": event.description or "",
        }
    else:
        desc_parts = []
        if event.teacher:
            desc_parts.append(f"Преподаватель: {event.teacher}")
        if event.description:
            desc_parts.append(event.description)

        return {
            "summary": event.title,
            "location": event.location or "",
            "description": "\n".join(desc_parts),
            "start": {"dateTime": event.start_at.isoformat(), "timeZone": "Europe/Moscow"},
            "end": {"dateTime": event.end_at.isoformat(), "timeZone": "Europe/Moscow"},
        }


def upsert_event(service, calendar_id: str, event, google_event_id: str | None) -> str:
    """Создаёт или обновляет событие в Google Calendar. Возвращает google_event_id."""
    body = event_to_google(event, calendar_id)
    try:
        if google_event_id:
            result = service.events().update(
                calendarId=calendar_id,
                eventId=google_event_id,
                body=body
            ).execute()
        else:
            result = service.events().insert(
                calendarId=calendar_id,
                body=body
            ).execute()
        return result["id"]
    except HttpError as e:
        if e.resp.status == 404 and google_event_id:
            # Событие удалено из Google — создаём заново
            result = service.events().insert(calendarId=calendar_id, body=body).execute()
            return result["id"]
        raise


def delete_event(service, calendar_id: str, google_event_id: str):
    try:
        service.events().delete(calendarId=calendar_id, eventId=google_event_id).execute()
    except HttpError:
        pass