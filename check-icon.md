# Icon Troubleshooting Guide

## What I've Fixed
1. ✅ Added proper icon configuration to app.config.js
2. ✅ Added splash screen configuration
3. ✅ Added iOS-specific icon configuration
4. ✅ Added Android adaptive icon configuration

## Icon Requirements for iOS App Store
Your icon should meet these requirements:

### Size Requirements
- **App Store**: 1024x1024 pixels
- **Format**: PNG (no transparency)
- **No rounded corners** (iOS adds them automatically)
- **File size**: Reasonable (under 1MB)

### Steps to Fix Icon Issues

1. **Verify Icon Dimensions**
   ```powershell
   # Check if your icon is 1024x1024
   # You can use online tools or image software to verify
   ```

2. **Clear EAS Build Cache**
   ```bash
   npx eas build:configure
   npx eas build --platform ios --clear-cache
   ```

3. **Check Icon File**
   - Make sure `assets/icon.png` is exactly 1024x1024 pixels
   - No transparency
   - No rounded corners
   - Square format

4. **Alternative: Use Expo's Icon Generator**
   ```bash
   npx expo install expo-app-loading
   # Then use Expo's online icon generator: https://buildicon.netlify.app/
   ```

## Common Issues & Solutions

### Issue: White icon in TestFlight
**Causes:**
- Icon is not 1024x1024 pixels
- Icon has transparency
- Icon path is incorrect
- Build cache is using old icon

**Solutions:**
1. Regenerate icon at correct size
2. Clear build cache
3. Make sure paths in app.config.js are correct
4. Rebuild with `--clear-cache` flag

### Issue: Icon works in development but not in build
**Solution:**
```bash
# Clear all caches and rebuild
expo r -c
npx eas build --platform ios --clear-cache
```

## Next Steps
1. Verify your icon meets the requirements above
2. Run the build command with cache clearing
3. If still not working, regenerate the icon file

## Build Commands
```bash
# For production build (TestFlight)
npx eas build --platform ios --profile production --clear-cache

# For preview build (internal testing)
npx eas build --platform ios --profile preview --clear-cache
```
