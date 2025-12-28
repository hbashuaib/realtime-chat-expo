
run-expo:		
	npx expo start
# 	npx expo start --clear

# 	npx expo start --dev-client
# 	npx expo start --dev-client --clear

#	npx expo run:android
#	expo start -C
#	npx expo start --clear

#	npx expo start --dev-client --host tunnel -c

run-android3:
	powershell.exe -Command "Start-Process powershell -ArgumentList 'cd \"D:\\My Projects\\realtime-chat-expo\"; npx expo start --android'"
#   npx expo start --android
#	$env:EXPO_NO_DOCTOR=1; npx expo start --android


run-android2:
	start "" cmd /C "cd /d \"D:\My Projects\realtime-chat-expo\" && npx expo start --android"

run-ios:
	cmd.exe /C start cmd /k "cd realtime-chat-expo && npx expo start --ios"

run-web:
	cmd.exe /C start cmd /k "cd realtime-chat-expo && npx expo start --web"

run-dev:
	cmd.exe /C start cmd /k "cd realtime-chat-expo && npx expo start"

server:
	.\env\scripts\activate && cd api && python manage.py runserver

redis:
	docker run --rm -p 6379:6379 redis:7

kill-metro:
	taskkill /F /IM node.exe /T

# 1. 	Build once with Gradle when you change native config:

# cd android
# .\gradlew assembleDebug

# 2. Install APK on both devices:
# adb -s emulator-5554 install -r android\app\build\outputs\apk\debug\app-debug.apk
# adb -s R5CT603J3CP install -r android\app\build\outputs\apk\debug\app-debug.apk

# 3. Start Metro from project root:
# npx expo start --dev-client --host tunnel -c

# 1. Remove node_modules
# Remove-Item -Recurse -Force .\node_modules

# 2. Remove lock file (npm or yarn)
# Remove-Item .\package-lock.json   # if you use npm
# Remove-Item .\yarn.lock           # if you use yarn

# 3. Clear build artifacts (optional but recommended)
# Remove-Item -Recurse -Force .\android\build
# Remove-Item -Recurse -Force .\android\app\build
# Remove-Item -Recurse -Force .\ios\build

# 4. Reinstall dependencies
# npm install        # or yarn install

# 5. Clear Metro cache
# npx expo start --clear

# 6. Rebuild dev client with EAS
# eas build --local --profile development --platform android

# Next time te rebild:
# eas build:dev --platform android

# adb -s R5CT603J3CP install -r app/build/outputs/apk/debug/app-debug.apk

# Tomorrow, if you want to make sure Expo regenerates  with your custom SDK values, we’ll move those settings into . But for tonight, you’re safe to run  — it won’t undo your changes.

# Git Commands:
# git add .
# git commit -m "Your commit message"
# git remote add origin https://github.com/hbashuaib/realtime-chat-expo.git
# git push -u origin master
# git remote -v

# Below make sure Gradle build and plugin are updated
# git add android/app/build.gradle app.plugin.js Makefile .idea/caches/deviceStreaming.xml
# git commit -m "Update Gradle build and plugin"
# git push origin master


# expo prebuild --clean
# npx expo run:android --variant debug

# or

# Remove-Item -Recurse -Force android\app\.cxx -ErrorAction SilentlyContinue
# Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
# Remove-Item -Recurse -Force android\build -ErrorAction SilentlyContinue
# npm install or npm install @react-native-async-storage/async-storage react-native-gesture-handler react-native-image-picker react-native-reanimated react-native-share react-native-worklets-core --force
# npx react-native autolink
# npx react-native codegen
# cd android
# .\gradlew clean -x externalNativeBuildCleanDebug
# .\gradlew assembleDebug or cd .. && npx expo run:android --variant debug

# Install APK on both devices:
# adb -s R5CT603J3CP install -r .\android\app\build\outputs\apk\debug\app-debug.apk

# Install APK on emulator:
# adb -s emulator-5554 install -r .\android\app\build\outputs\apk\debug\app-debug.apk

# 	npx expo start --dev-client

# adb logcat | findstr BashChatShare
# or
# adb logcat ActivityManager:I *:S

# adb logcat BashChatShare:D *:S

# adb logcat ActivityManager:I BashChatShare:D *:S

# adb logcat MainActivity:D ShareMenuActivity:D *:S

# adb logcat | grep com.anonymous.realtimechatexpo

# adb logcat *:D

# adb logcat | findstr "ShareMenuActivity MainActivity"

# adb logcat | Select-String -Pattern "ShareMenuActivity|MainActivity"

# adb logcat | Select-String -Pattern "ShareMenuActivity|MainActivity|\[Inbound Share\]"

# adb logcat | Select-String -Pattern "BashChatShare"

# adb logcat | Select-String -Pattern "BashChatShare|MainActivity"

# adb logcat | findstr "Inbound Share"

# adb logcat | findstr "BashChatTest|MainActivity"



# ./rebuild.ps1

# To check if ShareMenuActivity is in the APK manifest:
# & "C:\Users\w3h333\AppData\Local\Android\Sdk\build-tools\36.1.0\aapt2.exe" dump xmltree "D:\My Projects\realtime-chat-expo\android\app\build\outputs\apk\debug\app-debug.apk" --file AndroidManifest.xml | Select-String "ShareMenuActivity"


# Run emulator from command:
# & "C:\Users\w3h333\AppData\Local\Android\Sdk\emulator\emulator.exe" -list-avds
# & "C:\Users\w3h333\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_36.1

# or

# emulator -list-avds
# emulator -avd Pixel_6_API_35

# Some fresh steps to rebuild:

# Stop-Process -Name gradlew -Force -ErrorAction SilentlyContinue
# Stop-Process -Name java -Force -ErrorAction SilentlyContinue
# Stop-Process -Name node -Force -ErrorAction SilentlyContinue
# cmd /c "rd /s /q android"
# npx expo prebuild
# npx patch-package
# cd android
# cmd /c gradlew.bat clean -x externalNativeBuildCleanDebug
# cd ..
# npx expo run:android --variant debug

# New steps to rebuild my app:
# 1. Stop any running processes related to Node.js, Gradle, Java, and ADB:
# Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
# Get-Process -Name gradle -ErrorAction SilentlyContinue | Stop-Process -Force
# Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force
# Get-Process -Name adb -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Set the NODE_ENV environment variable to development:
# $env:NODE_ENV="development"

# 3. Remove the android directory to clear previous build artifacts:
# Remove-Item -Recurse -Force android

# 4. Rebuild the native project files using Expo prebuild:
# npx expo prebuild

# 5. Enter the android directory and clean the Gradle build:
# cd android
# .\gradlew.bat clean

# 6. Direct Gradle build or Expo wrapper that builds and runs:
# .\gradlew.bat :app:assembleDebug
# or
# cd .. &&
# npx expo run:android --variant debug

# 7. Go back to project root & Start Metro fresh:
# cd ..
# npx expo start -c

# 8. Install the APK on your connected Android device or emulator:
# adb install -r ".\android\app\build\outputs\apk\debug\app-debug.apk"


# How to use my new rebuild.ps1 script:

# - Quick rebuild (fastest, for small changes):
# .\rebuild.ps1 -Quick

# - Safe rebuild (cleans Gradle but skips fragile JNI clean):
# .\rebuild.ps1 -Safe

# - Full rebuild (nuclear option: wipes caches, node_modules, regenerates everything):
# .\rebuild.ps1 -Full

# Why this helps
# • 	Quick → saves time when you just need a new APK.
# • 	Safe → avoids JNI/fbjni errors but still cleans Gradle.
# • 	Full → guarantees a fresh environment when caches/locks are corrupted.


# 🛠 Git update workflow (step‑by‑step)
# 1- Make sure you’re on master
# git branch

# - Confirm the * is next to master.
# - If not:
# git checkout master

# 2- Stage your changes
# git add .

# - This stages all modified and new files.
# - If you want to be selective:
# git add path/to/file1 path/to/file2

# 3- Check what’s staged
# git status

# - Verify that the files you just changed (e.g., Makefile, plugins/…) are listed under “Changes to be committed.”

# 4- Commit your changes
# git commit -m "Describe your changes here"

# - Use a clear message so you know what this commit represents.
# 5- Push to remote repository/master
# git push origin master

# daily-push:
# git add . && git commit -m "Daily: publish latest working state" && git push origin master

# To check if SEND permission is in the APK manifest:
# & "C:\Users\w3h333\AppData\Local\Android\Sdk\build-tools\36.1.0\aapt2.exe" dump xmltree "D:\My Projects\realtime-chat-expo\android\app\build\outputs\apk\debug\app-debug.apk" --file AndroidManifest.xml | Select-String "SEND"

# cd "D:\My Projects\realtime-chat-expo"

# 1. See what changed
# git status

# 2. Stage all changes
# git add -A

# 3. Commit with a daily message
# git commit -m "Daily update: work progress and fixes"

# 4. Make sure you’re on master
# git branch -vv

# 5. Pull latest master with rebase (to avoid conflicts)
# git pull --rebase origin master

# 6. Push your changes up
# git push origin master

# or

# cd "D:\My Projects\realtime-chat-expo"

# Stage all changes
# git add -A

# Commit with a daily message
# git commit -m "Daily update: work progress and fixes"

# Push directly to master
# git push origin master


# or 

# git status
# git branch
# git add -A
# git commit -m "Daily update: work progress and fixes"
# git push origin master


# Update rebuild.ps1 to reply to below:

# [2025-12-25 18:41:44] Running expo prebuild...
# withShareMenuFix.js loaded
# withShareMenuFix function executing
# withManifestPackage fired
# withShareMenuActivity fired
# withNormalizeMainActivityViewFilters fired
# withMainActivityInboundHandling fired
# withShareMenuActivitySource fired
# ! Git branch has uncommitted file changes
# › It's recommended to commit all changes before proceeding in case you want to revert generated changes.

# ? Continue with uncommitted changes? » (Y/n)

# LogStep "Running expo prebuild (CI mode)..."
# $env:CI="1"
# npx expo prebuild --clean

# adb push "D:\TestImages\Men1.jpg" /sdcard/Download/Men1.jpg
# adb push "D:\TestImages\Men2.jpg" /sdcard/Download/Men2.jpg

# To test ShareMenuActivity from adb:
# adb shell am start -n com.anonymous.realtimechatexpo/.ShareMenuActivity -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "Hello from adb test"

# jar tf android/app/build/outputs/apk/debug/app-debug.apk | findstr ShareMenuActivity.class