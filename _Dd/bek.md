---
# yaml-language-server: $schema=schemas\page.schema.json
Object type:
    - Page
Creation date: "2025-12-14T21:15:04Z"
Created by:
    - Данечка
Emoji: "\U0001F916"
id: bafyreifz2c6crqsx7o3xo454repts6ysf6nfwrg4ijpck3lbdarxgegovu
---
# Бэк   
python(FastAPI, Uvicorn (сервер для запуска FastAPI), Pydantic (для валидации данных) и SQLAlchemy (для работы с базой данных))   
инициализация виртуального окружения `python3 -m venv venv`   
вход в виртуальное окружение `.\venv\Scripts\Activate`   
**работать с бэком только находясь в виртуальном окружении папки бэкенд!**   
сохранить зависимости `pip freeze > requirements.txt` (после подключения новых библиотек)   
   
запуск сервера  `uvicorn main:app --reload --port 8000`    
   
 если нужно убить процесс, который занимает порт `netstat -ano \| findstr :8000` (вместо 8000 подставить нужный)   
это выдаст список процессов в конце каждой строки будет идентификатор, его вставить в `taskkill /PID 12345 /F` вместо 12345   
также можно убить все процессы питона через `taskkill /IM python.exe /F`
   
   
   
