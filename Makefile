# BoostLite helpers — cookie export and debug install.
#
# Usage:
#   make android-cookie              # export to ~/Downloads/boostlite-reddit-cookies.txt
#   make android-cookie-push         # export + adb push to phone Downloads
#   make android-build               # assemble debug APK (no device required)
#   make android-install             # build + adb install (emulator or USB device)
#   make android-install ADB="adb -s SERIAL"
#   make android-cookie OUT=/tmp/c.txt BROWSER=firefox

ANDROID_COOKIE_OUT ?= $(HOME)/Downloads/boostlite-reddit-cookies.txt
ANDROID_COOKIE_DEVICE ?= /sdcard/Download/boostlite-reddit-cookies.txt
BROWSER ?= firefox
ADB ?= adb

.PHONY: android-cookie android-cookie-push android-build android-install help

help:
	@echo "Targets:"
	@echo "  android-cookie       Export Firefox reddit.com cookies (close Firefox first)"
	@echo "  android-cookie-push  Export + adb push to device Downloads"
	@echo "  android-build        Assemble BoostLite debug APK"
	@echo "  android-install      Build debug APK and adb install (emulator or USB device)"
	@echo ""
	@echo "Vars: ANDROID_COOKIE_OUT BROWSER ADB ANDROID_COOKIE_DEVICE JAVA_HOME"

android-cookie:
	@echo "→ Exporting $(BROWSER) cookies → $(ANDROID_COOKIE_OUT)"
	@echo "  (Close Firefox completely first.)"
	npm run export-android-cookie -- --out "$(ANDROID_COOKIE_OUT)" --browser "$(BROWSER)"

android-cookie-push: android-cookie
	@command -v $(ADB) >/dev/null 2>&1 || { echo "adb not found (install Android platform-tools)"; exit 1; }
	@echo "→ Checking device..."
	@$(ADB) get-state >/dev/null
	@echo "→ Pushing to $(ANDROID_COOKIE_DEVICE)"
	$(ADB) push "$(ANDROID_COOKIE_OUT)" "$(ANDROID_COOKIE_DEVICE)"
	@echo "✅ On phone: BoostLite → Settings → Import file → Downloads/boostlite-reddit-cookies.txt"

android-build:
	@echo "→ Building BoostLite debug APK"
	cd android-app && JAVA_HOME="$${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew assembleDebug

android-install: android-build
	@command -v $(ADB) >/dev/null 2>&1 || { echo "adb not found (install Android platform-tools)"; exit 1; }
	@$(ADB) get-state >/dev/null
	@echo "→ Installing"
	$(ADB) install -r android-app/app/build/outputs/apk/debug/app-debug.apk
	@echo "✅ Installed. Launch BoostLite → Settings → Import file"
