@echo off
setlocal
set "APP_URL=https://www.itestu.uz/login"

where msedge >nul 2>&1 && (
  start "" msedge --app=%APP_URL% --window-size=1280,860
  exit /b 0
)

where chrome >nul 2>&1 && (
  start "" chrome --app=%APP_URL% --window-size=1280,860
  exit /b 0
)

start "" %APP_URL%
exit /b 0
