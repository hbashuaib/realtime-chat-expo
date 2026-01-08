# Nginx Daily Clean Start Script
# Save as nginx-clean.ps1 and run with: powershell -ExecutionPolicy Bypass -File nginx-clean.ps1

$nginxPath = "C:\tools\nginx-1.29.4\nginx.exe"
$pidFile   = "C:\tools\nginx-1.29.4\logs\nginx.pid"

Write-Host "=== Nginx Daily Clean Start ==="

# Step 1: Stop any existing Nginx
Write-Host "Stopping any existing Nginx processes..."
if (Test-Path $pidFile) {
    & $nginxPath -s stop
    Start-Sleep -Seconds 2
} else {
    taskkill /IM nginx.exe /F > $null 2>&1
}

# Step 2: Start Nginx fresh
Write-Host "Starting Nginx..."
& $nginxPath
Start-Sleep -Seconds 2

# Step 3: Show status
Write-Host "`nActive Nginx processes:"
tasklist /FI "IMAGENAME eq nginx.exe"

Write-Host "`nPort 443 status:"
netstat -ano | findstr :443