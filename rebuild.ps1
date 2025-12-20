# rebuild.ps1
# Interactive tiered clean & rebuild for BashChat
# Run: .\rebuild.ps1

Write-Host "BashChat Rebuild Options"
Write-Host "1. Quick Build: Saves time by skipping clean, just assembles and installs the debug APK."
Write-Host "2. Safe Build: Cleans Gradle (skips fragile JNI clean) and rebuilds. Good balance of speed & stability."
Write-Host "3. Full Build: Wipes caches, node_modules, regenerates Android project, guarantees a fresh environment."

$choice = Read-Host "Select your option from above (1, 2 or 3)"

# Step 1: Go to project root
Set-Location "D:\My Projects\realtime-chat-expo"

# Step 2: Kill lingering processes
Write-Host "Killing lingering processes..."
Get-Process -Name gradle -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name adb -ErrorAction SilentlyContinue | Stop-Process -Force

# Step 3: Stop Gradle daemons if wrapper exists
if (Test-Path "android\gradlew.bat") {
    Write-Host "Stopping Gradle daemons..."
    Set-Location android
    & ".\gradlew.bat" --stop
    Set-Location ..
}

switch ($choice) {
    "1" {
        Write-Host "⚡ Quick Build selected..."
        Set-Location android
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    "2" {
        Write-Host "Safe Build selected..."
        Set-Location android
        & ".\gradlew.bat" clean -x externalNativeBuildCleanDebug
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    "3" {
        Write-Host "Full Build selected..."

        # Delete stale build artifacts and lock files
        Remove-Item -Force "android\.gradle\noVersion\buildLogic.lock" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\app\.cxx" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue

        # Wipe Metro/Expo caches
        Remove-Item -Recurse -Force -Path .expo, .expo-shared, node_modules\.cache -ErrorAction SilentlyContinue

        # Wipe node_modules
        Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue

        # Reinstall node modules
        Write-Host "Reinstalling node modules..."
        npm install

        # Run Expo prebuild
        Write-Host "Running expo prebuild..."
        npx expo prebuild --clean

        # Safe Gradle clean
        Set-Location android
        & ".\gradlew.bat" clean -x externalNativeBuildCleanDebug
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    default {
        Write-Host "Invalid choice. Please run again and select 1, 2, or 3."
        exit
    }
}

# Step 4: Ask if user wants to install APK
$installChoice = Read-Host "Do you want to install the debug APK on device/emulator? (Y/N)"
if ($installChoice -eq "Y" -or $installChoice -eq "y") {
    Write-Host "Installing APK..."
    adb install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "APK installed successfully!"
} else {
    Write-Host "Skipping APK installation."
}

Write-Host "$choice rebuild complete!"