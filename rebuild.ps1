# rebuild.ps1
# Interactive tiered clean & rebuild for BashChat
# Run: .\rebuild.ps1

function LogStep($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message"
}

LogStep "BashChat Rebuild Options"
Write-Host "1. Quick Build: Skips clean, just assembles and installs the debug APK."
Write-Host "2. Safe Build: Cleans Gradle (skips fragile JNI clean) and rebuilds."
Write-Host "3. Full Build: Wipes caches, node_modules, regenerates Android project."
Write-Host "4. Medium Build: Clears Gradle/Expo caches but keeps node_modules for speed."

$choice = Read-Host "Select your option from above (1, 2, 3 or 4)"

# Step 1: Go to project root
Set-Location "D:\My Projects\realtime-chat-expo"

# Step 2: Kill lingering processes (keep VS Code open)
LogStep "Killing lingering processes..."
Get-Process -Name gradle -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name adb -ErrorAction SilentlyContinue | Stop-Process -Force
# Removed 'code' so VS Code stays open

# Step 3: Stop Gradle daemons if wrapper exists
if (Test-Path "android\gradlew.bat") {
    LogStep "Stopping Gradle daemons..."
    Set-Location android
    & ".\gradlew.bat" --stop
    Set-Location ..
}

switch ($choice) {
    "1" {
        LogStep "Quick Build selected..."
        Set-Location android
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    "2" {
        LogStep "Safe Build selected..."
        Set-Location android
        & ".\gradlew.bat" clean -x externalNativeBuildCleanDebug
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    "3" {
        LogStep "Full Build selected..."

        # Delete stale build artifacts and lock files
        LogStep "Cleaning Gradle caches and build artifacts..."
        Get-ChildItem -Path "android\.gradle" -Recurse -Filter *.lock -ErrorAction SilentlyContinue |
            Remove-Item -Force -ErrorAction SilentlyContinue
        Remove-Item -Force "android\.gradle\noVersion\buildLogic.lock" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\app\.cxx" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue

        # Wipe Metro/Expo caches
        LogStep "Clearing Metro/Expo caches..."
        Remove-Item -Recurse -Force -Path .expo, .expo-shared, node_modules\.cache -ErrorAction SilentlyContinue

        # Wipe node_modules
        LogStep "Removing node_modules..."
        Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue

        # Reinstall node modules
        LogStep "Reinstalling node modules..."
        npm install

        # Apply patches safely
        LogStep "Applying patches..."
        npx patch-package
        if ($LASTEXITCODE -ne 0) {
            LogStep "Patch-package failed. Check your patches folder."
        }

        # Run Expo prebuild
        LogStep "Running expo prebuild..."
        npx expo prebuild --clean

        # Verify gradlew exists
        if (-Not (Test-Path "android\gradlew.bat")) {
            LogStep "Gradle wrapper missing, regenerating..."
            npx expo prebuild --platform android
        }

        # Safe Gradle clean
        LogStep "Running Gradle clean and build..."
        Set-Location android
        & ".\gradlew.bat" clean -x externalNativeBuildCleanDebug
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    "4" {
        LogStep "Medium Build selected..."

        # Clear Gradle/Expo caches but keep node_modules
        LogStep "Clearing Gradle/Expo caches..."
        Remove-Item -Recurse -Force -Path .expo, .expo-shared, node_modules\.cache -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue

        # Run Expo prebuild without wiping node_modules
        LogStep "Running expo prebuild..."
        npx expo prebuild

        LogStep "Running Gradle clean and build..."
        Set-Location android
        & ".\gradlew.bat" clean -x externalNativeBuildCleanDebug
        & ".\gradlew.bat" :app:assembleDebug
        Set-Location ..
    }

    default {
        LogStep "Invalid choice. Please run again and select 1, 2, 3, or 4."
        exit
    }
}

# Step 4: Ask if user wants to install APK
$installChoice = Read-Host "Do you want to install the debug APK on device/emulator? (Y/N)"
if ($installChoice -eq "Y" -or $installChoice -eq "y") {
    LogStep "Installing APK..."
    adb install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"
    LogStep "APK installed successfully!"
} else {
    LogStep "Skipping APK installation."
}

LogStep "$choice rebuild complete!"