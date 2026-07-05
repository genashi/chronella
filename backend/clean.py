from app.database import SessionLocal
from app.models import ControlPoint

def clean_points():
    db = SessionLocal()
    try:
        deleted = db.query(ControlPoint).delete()
        db.commit()
        print(f"Готово! Удалено старых контрольных точек: {deleted}")
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_points()
