# Nginx Helper Script
# Save this as nginx-helper.ps1 and run with:
#   powershell -ExecutionPolicy Bypass -File nginx-helper.ps1 -Action start|stop|reload|status

param(
    [ValidateSet("start","stop","reload","status")]
    [string]$Action = "status"
)

# Absolute paths to your Nginx installation
$nginxPath = "C:\tools\nginx-1.29.4\nginx.exe"
$pidFile   = "C:\tools\nginx-1.29.4\logs\nginx.pid"
$confFile  = "C:\tools\nginx-1.29.4\conf\nginx.conf"
$errorLog  = "C:\tools\nginx-1.29.4\logs\error.log"

switch ($Action) {
    "start" {
        Write-Host "Starting Nginx with config $confFile..."
        & $nginxPath -c $confFile
    }
    "stop" {
        if (Test-Path $pidFile) {
            Write-Host "Stopping Nginx gracefully..."
            & $nginxPath -s stop
        } else {
            Write-Host "No PID file found. Forcing kill if any nginx.exe exists..."
            taskkill /IM nginx.exe /F
        }
    }
    "reload" {
        if (Test-Path $pidFile) {
            Write-Host "Reloading Nginx config..."
            & $nginxPath -s reload
        } else {
            Write-Host "No PID file found. Nginx may not be running."
        }
    }
    "status" {
        Write-Host "Checking Nginx processes..."
        tasklist /FI "IMAGENAME eq nginx.exe"
        Write-Host "`nChecking port 443..."
        netstat -ano | findstr :443
        Write-Host "`nChecking error log..."
        if (Test-Path $errorLog) {
            Get-Content $errorLog -Tail 10
        } else {
            Write-Host "No error log found at $errorLog"
        }
    }
}