@echo off
echo =================================================
echo   Fixing App Icon Issue for TestFlight Build
echo =================================================
echo.

echo Step 1: Clearing Expo development cache...
call npx expo start --clear
echo   ✓ Expo cache cleared
echo.

echo Step 2: Clearing EAS build cache and building for iOS...
echo   This will use your new icon.png, splash.png, and favicon.png files
call npx eas build --platform ios --profile production --clear-cache
echo.

echo =================================================
echo Build started! Check the EAS dashboard for progress.
echo.
echo Your new configuration uses:
echo   • App Icon: ./assets/icon.png
echo   • Splash Screen: ./assets/splash.png  
echo   • Favicon: ./assets/favicon.png
echo.
echo If the icon is still white in TestFlight:
echo   1. Make sure icon.png is exactly 1024x1024 pixels
echo   2. Ensure it's PNG format without transparency
echo   3. Check that the file isn't corrupted
echo =================================================
echo.
pause
