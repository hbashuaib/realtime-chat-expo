# start-bashchat.ps1
# Run as normal user (Docker Desktop must already be running)

function Start-Terminal($title, $command, $path) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$path'; $command" -WindowStyle Normal
}

# 1. Redis via Docker
Start-Terminal "Redis" "docker run --rm -p 6379:6379 redis:7" "D:\my projects\realtime-chat-expo"

# 2. Django server
Start-Terminal "Django" "env\Scripts\activate; python manage.py runserver 0.0.0.0:8000" "D:\my projects\realtime-chat-expo\api"

# 3. Nginx
Start-Terminal "Nginx" ".\nginx.exe" "C:\tools\nginx-1.29.4"

# 4. Metro bundler
Start-Terminal "Metro" "npx expo start" "D:\my projects\realtime-chat-expo"