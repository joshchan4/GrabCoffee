@echo off
echo =======================================================
echo   🚀 COMPLETE DEPLOYMENT SCRIPT - ALL FIXES APPLIED
echo =======================================================
echo.
echo This will deploy fixes for:
echo   ✅ Stripe payment rounding issues
echo   ✅ Google/Apple OAuth login problems  
echo   ✅ App icon display issues
echo.
echo =======================================================

pause
echo.

echo Step 1: Committing changes to GitHub...
echo ----------------------------------------
git add .
git commit -m "Fix: Stripe payment rounding, OAuth login issues, and app icon configuration - Fixed amount calculation rounding in CartScreen.js and OrderSummaryScreen.js - Added fallback amount calculation in backend paymentRoutes.js - Fixed Google/Apple OAuth session creation in LoginScreen.js and SignupScreen.js - Updated app.config.js with proper icon paths (icon.png, splash.png, favicon.png) - Added validation and better error handling for payments - Resolved missing route parameters when returning from login/signup"

echo.
echo Step 2: Pushing to GitHub...
echo -----------------------------
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Failed to push to GitHub
    echo Please check your Git configuration and try again
    pause
    exit /b 1
)

echo ✅ Successfully pushed to GitHub!
echo.

echo Step 3: Backend will auto-deploy on Render (if connected to GitHub)
echo Check: https://dashboard.render.com
echo.

echo Step 4: Clearing Expo cache...
echo --------------------------------
call expo r -c
echo ✅ Expo cache cleared
echo.

echo Step 5: Building for iOS App Store (this takes 15-30 minutes)...
echo ================================================================
echo Starting EAS build with cache clearing...
call npx eas build --platform ios --profile production --clear-cache

echo.
echo =======================================================
echo   🎉 DEPLOYMENT PROCESS STARTED!
echo =======================================================
echo.
echo Next Steps:
echo 1. ✅ Code pushed to GitHub
echo 2. ⏳ Backend deploying on Render (check dashboard)
echo 3. ⏳ iOS build in progress (check EAS dashboard)
echo 4. 📱 Once build completes, submit to App Store Connect
echo 5. 🧪 Test in TestFlight to verify all fixes work
echo.
echo Monitor your build progress at the EAS dashboard URL shown above.
echo.
echo All three issues should be resolved:
echo   • Stripe rounding: $6.21 stays $6.21
echo   • OAuth login: No more session creation errors
echo   • App icon: Shows properly instead of white screen
echo =======================================================
pause
