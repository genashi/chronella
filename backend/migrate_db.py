"""
Скрипт миграции базы данных для добавления недостающих колонок.
Запустите этот скрипт один раз для обновления структуры базы данных.
"""
import sqlite3
import os

# Путь к базе данных
DB_PATH = "database.db"

def migrate_database():
    """Добавляет недостающие колонки в таблицу users."""
    if not os.path.exists(DB_PATH):
        print(f"База данных {DB_PATH} не найдена. Она будет создана при следующем запуске сервера.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Получаем список существующих колонок
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        
        print(f"Существующие колонки: {existing_columns}")
        
        # Список колонок, которые нужно добавить
        columns_to_add = [
            ("mrsu_username", "TEXT"),
            ("mrsu_password_encrypted", "TEXT"),
            ("is_mrsu_verified", "BOOLEAN DEFAULT 0"),
            ("google_refresh_token", "TEXT"),
            ("is_google_verified", "BOOLEAN DEFAULT 0"),
        ]
        
        # Добавляем недостающие колонки
        for column_name, column_type in columns_to_add:
            if column_name not in existing_columns:
                try:
                    alter_sql = f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"
                    cursor.execute(alter_sql)
                    print(f"[OK] Добавлена колонка: {column_name}")
                except sqlite3.OperationalError as e:
                    print(f"[ERROR] Ошибка при добавлении колонки {column_name}: {e}")
            else:
                print(f"[SKIP] Колонка {column_name} уже существует")
        
        conn.commit()
        print("\n[SUCCESS] Миграция завершена успешно!")
        
    except sqlite3.Error as e:
        print(f"✗ Ошибка при миграции: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Запуск миграции базы данных...")
    migrate_database()

