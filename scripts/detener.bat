@echo off
REM Detiene el modo en vivo (puertos 8000 backend y 5173 front)
for %%P in (8000 5173) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
    echo Deteniendo PID %%a (puerto %%P)...
    taskkill /PID %%a /F >nul 2>&1
  )
)
echo Listo.
pause
