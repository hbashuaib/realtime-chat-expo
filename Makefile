
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