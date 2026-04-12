
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
# 01670780



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


# Docker Compose Commands:
# docker compose up
# docker compose down
# docker compose logs -f
# docker compose up --build

# New Metro run commands with new localhost:8081:
# npx expo start --host lan
# adb reverse tcp:8081 tcp:8081
# login to Android device using: http://localhost:8081




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

# npx expo start --dev-client

# npx expo start --host lan

# npx expo start --host localhost

# .\nginx.exe

# adb logcat -s BashChatTest ReactNative



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

# adb logcat | Select-String "BashChatTest"

# adb logcat -v time > full.log
# >> Select-String -Path full.log -Pattern "BashChatTest|ShareMenuActivity|MainActivity"

# adb logcat | findstr BashChatTest

# adb logcat -s BashChatTest ReactNativeJS ReactNative

# adb logcat -s BashChatTest ReactNative

# ./gradlew :app:dependencies | findstr bash-share-module

# npx expo run:android --variant release
# npx expo start


# ./rebuild.ps1

# git status
# git branch
# git add -A
# git commit -m "Daily update: work progress and fixes"
# git push origin master

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


# Define source and destination
# $srcApk = "android\app\build\outputs\apk\debug\app-debug.apk"
# $destApk = "D:\app-debug.zip"

# Copy and rename the APK to D:\ as a .zip
# Copy-Item $srcApk $destApk -Force

# Expand the archive into a folder
# Expand-Archive -Path $destApk -DestinationPath "D:\apk_unpacked" -Force



# New Rebuild Steps:
# ./rebuild.ps1 - Full Build Option 3

# cd android
# .\gradlew.bat clean or .\gradlew.bat clean -x externalNativeBuildCleanDebug
# .\gradlew.bat :app:compileDebugJavaWithJavac --rerun-tasks --info
# cd ..

# New rebuild for release version (No Metro)
# npx expo run:android --variant release

# adb install android/app/build/outputs/apk/release/app-release.apk

# Nginx Server:
# PS C:\tools\nginx-1.29.4> .\nginx.exe
# .\nginx.exe -s reload
# .\nginx.exe -s stop   # immediate termination
# .\nginx.exe -s quit   # graceful shutdown



# checking nginx port 443 runding service:
# PS C:\tools\nginx-1.29.4> sc.exe stop nginx
# >> sc.exe config nginx start= disabled
# >> sc.exe delete nginx


# PS C:\tools\nginx-1.29.4> Get-Service | findstr nginx
# PS C:\tools\nginx-1.29.4> netstat -ano | findstr :443


# using my nginx-helper.ps1:
# - .\nginx-helper.ps1 start
# - .\nginx-helper.ps1 stop
# - .\nginx-helper.ps1 reload
# - .\nginx-helper.ps1 status


# Using daily clean up "nginx-clean.ps1":
# powershell -ExecutionPolicy Bypass -File nginx-clean.ps1

# PS D:\certs> openssl x509 -req -in D:\certs\bashchat.csr `
# >>     -CA D:\certs\newRootCA.crt `
# >>     -CAkey D:\certs\newRootCA.key `
# >>     -CAcreateserial `
# >>     -out D:\certs\bashchat.pem `
# >>     -days 365 -sha256 `
# >>     -extfile D:\certs\bashchat.ext
# Certificate request self-signature ok
# subject=CN=bashchat.local
# PS D:\certs>


# PS D:\certs> mkcert -install
# The local CA is already installed in the system trust store! 👍
# The local CA is already installed in Java's trust store! 👍

# PS D:\certs> mkcert bashchat.local 10.0.2.2 192.168.8.207

# Created a new certificate valid for the following names 📜
#  - "bashchat.local"
#  - "10.0.2.2"
#  - "192.168.8.207"

# The certificate is at "./bashchat.local+2.pem" and the key at "./bashchat.local+2-key.pem" ✅

# It will expire on 8 April 2028 🗓

# PS D:\certs>



# <network-security-config>
#   <!-- Allow cleartext only for Metro dev server -->
#   <domain-config cleartextTrafficPermitted="true">    
#     <domain includeSubdomains="true">10.0.2.2</domain>    
#     <domain includeSubdomains="true">192.168.8.207</domain>
#   </domain-config>

#   <!-- Enforce HTTPS trust for your API endpoints -->
#   <domain-config cleartextTrafficPermitted="false">
#     <domain includeSubdomains="true">bashchat.local</domain>    
#     <trust-anchors>
#       <certificates src="system"/>
#       <certificates src="user"/>
#     </trust-anchors>
#   </domain-config>
# </network-security-config>

# - Run a linter/formatter locally
# Add ESLint + Prettier to your project. They’ll catch mismatched braces or duplicated lines instantly, before you rebuild.

# npm install --save-dev eslint prettier
# npx eslint src/bridges/InboundShareBridge.jsx




# // Create BashShareModule.kt, BashSharePackage.kt, and BashShareQueue.kt for native share queueing
# function withBashShareNativeModule(config) {
#   return withDangerousMod(config, [
#     "android",
#     (cfg) => {
#       const srcDir = path.join(
#         cfg.modRequest.projectRoot,
#         "android",
#         "app",
#         "src",
#         "main",
#         "java",
#         "com",
#         "anonymous",
#         "realtimechatexpo",
#       );
#       fs.mkdirSync(srcDir, { recursive: true });

#       const modulePath = path.join(srcDir, "BashShareModule.kt");
#       const packagePath = path.join(srcDir, "BashSharePackage.kt");
#       const queuePath = path.join(srcDir, "BashShareQueue.kt");

#       const moduleCode = `package com.anonymous.realtimechatexpo

# import com.facebook.react.bridge.ReactApplicationContext
# import com.facebook.react.bridge.ReactContextBaseJavaModule
# import com.facebook.react.modules.core.DeviceEventManagerModule
# import com.facebook.react.module.annotations.ReactModule
# import com.facebook.react.bridge.ReactMethod
# import com.facebook.react.bridge.Promise

# @ReactModule(name = "BashShareModule")
# class BashShareModule(reactContext: ReactApplicationContext) :
#   ReactContextBaseJavaModule(reactContext) {

#   override fun getName(): String = "BashShareModule"

#   // Required for NativeEventEmitter
#   @ReactMethod
#   fun addListener(eventName: String) { /* no-op */ }

#   @ReactMethod
#   fun removeListeners(count: Int) { /* no-op */ }

#   // ✅ NEW: trivial test method to confirm bridge works
#   @ReactMethod
#   fun ping(promise: Promise) {
#     promise.resolve("pong from native")
#   }


#   @ReactMethod
#   fun consumePendingShare(promise: Promise) {
#     try {
#       val v = BashShareQueue.consume()
#       promise.resolve(v)
#     } catch (e: Exception) {
#       promise.reject("ERR_CONSUME_PENDING", e)
#     }
#   }

#   // Explicitly expose notifyShareReceived to JS
#   @ReactMethod
#   fun notifyShareReceived(json: String) {
#     if (reactApplicationContext.hasActiveCatalystInstance()) {
#       reactApplicationContext
#         .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
#         .emit("onShareReceived", json)
#     }
#   }
# }
# `;

#       const packageCode = `package com.anonymous.realtimechatexpo

# import com.facebook.react.ReactPackage
# import com.facebook.react.bridge.NativeModule
# import com.facebook.react.bridge.ReactApplicationContext
# import com.facebook.react.uimanager.ViewManager

# class BashSharePackage : ReactPackage {
#   override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
#     val modules = mutableListOf<NativeModule>()
#     modules.add(BashShareModule(reactContext))
#     return modules
#   }

#   override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
#     return emptyList()
#   }
# }
# `;

#       const queueCode = `package com.anonymous.realtimechatexpo

# object BashShareQueue {
#   @Volatile private var pending: String? = null

#   @JvmStatic fun setPending(value: String?) {
#     pending = value
#   }

#   @JvmStatic fun consume(): String? {
#     val v = pending
#     pending = null
#     return v
#   }

#   @JvmStatic fun peek(): String? {
#     return pending
#   }
# }
# `;

#       // Always overwrite to ensure files exist after prebuild
#       fs.writeFileSync(modulePath, moduleCode);
#       fs.writeFileSync(packagePath, packageCode);
#       fs.writeFileSync(queuePath, queueCode);

#       if (
#         fs.existsSync(modulePath) &&
#         fs.existsSync(packagePath) &&
#         fs.existsSync(queuePath)
#       ) {
#         console.log(
#           "✅ Verified BashShareModule.kt, BashSharePackage.kt, BashShareQueue.kt exist",
#         );
#       } else {
#         console.error("❌ Native module files missing after injection");
#       }

#       return cfg;
#     },
#   ]);
# }

# // Register BashSharePackage in MainApplication.kt
# function withRegisterBashSharePackage(config) {
#   return withDangerousMod(config, [
#     "android",
#     (cfg) => {
#       const appPath = path.join(
#         cfg.modRequest.projectRoot,
#         "android",
#         "app",
#         "src",
#         "main",
#         "java",
#         "com",
#         "anonymous",
#         "realtimechatexpo",
#         "MainApplication.kt",
#       );
#       if (!fs.existsSync(appPath)) return cfg;

#       let src = fs.readFileSync(appPath, "utf8");

#       // Ensure import
#       if (
#         !src.includes("import com.anonymous.realtimechatexpo.BashSharePackage")
#       ) {
#         src = src.replace(
#           /(package[^\n]*\n)/,
#           `$1import com.anonymous.realtimechatexpo.BashSharePackage\n`,
#         );
#       }

#       // Replace getPackages() override with explicit form
#       src = src.replace(
#         /override fun getPackages[^{]*\{[^}]*\}/s,
#         `override fun getPackages(): List<ReactPackage> {
#     val packages = PackageList(this).packages.toMutableList()
#     packages.add(BashSharePackage())
#     return packages
#   }`,
#       );

#       fs.writeFileSync(appPath, src);
#       console.log(
#         "✅ Injected explicit getPackages override with BashSharePackage",
#       );
#       return cfg;
#     },
#   ]);
# }


# // Create BashShareQueue.kt for native share queueing
# function withBashShareQueueFile(config) {
#   return withDangerousMod(config, [
#     "android",
#     (cfg) => {
#       const srcDir = path.join(
#         cfg.modRequest.projectRoot,
#         "android",
#         "app",
#         "src",
#         "main",
#         "java",
#         "com",
#         "anonymous",
#         "realtimechatexpo",
#       );
#       fs.mkdirSync(srcDir, { recursive: true });

#       const queuePath = path.join(srcDir, "BashShareQueue.kt");
#       const queueCode = `package com.anonymous.realtimechatexpo

# object BashShareQueue {
#   @Volatile private var pending: String? = null

#   @JvmStatic fun setPending(value: String?) {
#     pending = value
#   }

#   @JvmStatic fun consume(): String? {
#     val v = pending
#     pending = null
#     return v
#   }

#   @JvmStatic fun peek(): String? {
#     return pending
#   }
# }
# `;
#       fs.writeFileSync(queuePath, queueCode);
#       console.log("✅ Injected BashShareQueue.kt");
#       return cfg;
#     },
#   ]);
# }


# function normalizeDefaultConfigBlock(content) {
#   // Ensure defaultConfig has single numeric min/target sdk lines,
#   // and remove any rootProject.ext overrides that re-introduce API 29.
#   return content.replace(/defaultConfig\s*\{([\s\S]*?)\}/m, (match, inner) => {
#     let block = inner;

#     // Remove any rootProject.ext based lines
#     block = block.replace(
#       /^\s*minSdkVersion\s+rootProject\.ext\.minSdkVersion\s*$/gm,
#       "",
#     );
#     block = block.replace(
#       /^\s*targetSdkVersion\s+rootProject\.ext\.targetSdkVersion\s*$/gm,
#       "",
#     );

#     // Normalize any existing min/target lines (numeric or not) to correct values
#     block = block.replace(
#       /^\s*minSdkVersion\s+.*$/gm,
#       "        minSdkVersion 24",
#     );
#     block = block.replace(
#       /^\s*targetSdkVersion\s+.*$/gm,
#       "        targetSdkVersion 35",
#     );

#     // If min/target lines are missing, inject them near top of the block
#     if (!/minSdkVersion\s+24/.test(block)) {
#       block = `        minSdkVersion 24\n` + block;
#     }
#     if (!/targetSdkVersion\s+35/.test(block)) {
#       block = `        targetSdkVersion 35\n` + block;
#     }

#     return `defaultConfig {\n${block}\n    }`;
#   });
# }

# // Native queue + module
#   config = withBashShareQueueFile(config);
#   config = withBashShareNativeModule(config);
#   config = withRegisterBashSharePackage(config);


# withNetworkSecurityConfig.js:
# <network-security-config>
#   <!-- Metro + API for 10.0.2.2 -->
#   <domain-config cleartextTrafficPermitted="true">
#     <domain includeSubdomains="true">10.0.2.2</domain>
#     <trust-anchors>
#       <certificates src="system"/>
#       <certificates src="user"/>
#     </trust-anchors>
#   </domain-config>

#   <!-- Metro + API for 192.168.3.50 -->
#   <domain-config cleartextTrafficPermitted="true">
#     <domain includeSubdomains="true">192.168.3.50</domain>
#     <trust-anchors>
#       <certificates src="system"/>
#       <certificates src="user"/>
#     </trust-anchors>
#   </domain-config>

#   <!-- API only for bashchat.local -->
#   <domain-config cleartextTrafficPermitted="false">
#     <domain includeSubdomains="true">bashchat.local</domain>
#     <trust-anchors>
#       <certificates src="system"/>
#       <certificates src="user"/>
#     </trust-anchors>
#   </domain-config>
# </network-security-config>