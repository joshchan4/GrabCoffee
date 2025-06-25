# OAuth Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. "Invalid Login" Error

**Possible Causes:**
- Missing or incorrect URL scheme configuration
- OAuth providers not properly configured in Supabase
- Missing redirect URLs in OAuth provider settings
- Network connectivity issues

**Solutions:**

#### A. Check URL Scheme Configuration
Ensure your app has the correct URL scheme configured:

```javascript
// app.config.js
export default {
  expo: {
    scheme: "grabcoffee",
    // ... other config
  }
}
```

#### B. Verify Supabase OAuth Settings
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Providers
3. Enable Google and Apple providers
4. Add redirect URLs:
   - `grabcoffee://login-callback`
   - `grabcoffee://signup-callback`
   - `grabcoffee://google-test-callback`
   - `grabcoffee://apple-test-callback`

#### C. Configure OAuth Providers

**Google OAuth:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://gvsqxdvmqlnyfikmrjdf.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

**Apple OAuth:**
1. Go to Apple Developer Console
2. Create App ID with Sign in with Apple capability
3. Create Service ID
4. Configure redirect URLs in Supabase

### 2. OAuth Flow Not Completing

**Symptoms:**
- Browser opens but doesn't return to app
- User gets stuck in authentication flow
- No success/error callbacks

**Solutions:**

#### A. Check Deep Link Handling
Ensure your app properly handles deep links:

```javascript
// App.js
useEffect(() => {
  const handleDeepLink = (url) => {
    if (url) {
      WebBrowser.maybeCompleteAuthSession();
    }
  };

  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });

  return () => subscription?.remove();
}, []);
```

#### B. Verify Redirect URLs
Make sure redirect URLs match exactly:
- `grabcoffee://login-callback`
- `grabcoffee://signup-callback`

### 3. Profile Creation Issues

**Symptoms:**
- User authenticates but profile not created
- Missing user data in profiles table

**Solutions:**

#### A. Check Database Schema
Ensure your profiles table has the correct structure:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### B. Enable Row Level Security (RLS)
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 4. Debug Tools

Use the debug tools in the LoginScreen (development only):

1. **Debug Auth State**: Check current authentication status
2. **Test Google OAuth**: Test Google OAuth URL generation
3. **Test Apple OAuth**: Test Apple OAuth URL generation

### 5. Console Logging

Check console logs for these key messages:
- `🔍 Starting authentication debug...`
- `📋 Current session: Active/None`
- `✅ Database connection successful`
- `🔍 Testing Google/Apple OAuth...`
- `✅ OAuth URL generated`

### 6. Network Issues

**Check:**
- Internet connectivity
- Firewall settings
- VPN interference
- DNS resolution

### 7. Platform-Specific Issues

**iOS:**
- Ensure bundle identifier matches: `com.coffee.grab`
- Check Info.plist for URL scheme configuration
- Verify Apple Developer account settings

**Android:**
- Ensure package name matches: `com.coffee.grab`
- Check AndroidManifest.xml for intent filters
- Verify Google Cloud Console settings

### 8. Testing Checklist

Before testing OAuth:

- [ ] Supabase project is active
- [ ] OAuth providers are enabled in Supabase
- [ ] Redirect URLs are configured correctly
- [ ] App is built with latest configuration
- [ ] Testing on physical device (not simulator)
- [ ] Network connectivity is stable
- [ ] Console logs are being monitored

### 9. Common Error Messages

**"Invalid login"**
- Check OAuth provider configuration
- Verify redirect URLs
- Ensure app scheme is configured

**"Provider not enabled"**
- Enable provider in Supabase Dashboard
- Check provider credentials

**"Redirect URI mismatch"**
- Verify redirect URLs in OAuth provider settings
- Check app scheme configuration

**"Network error"**
- Check internet connectivity
- Verify Supabase project status
- Check firewall settings

### 10. Production Considerations

Before deploying to production:

1. Remove debug tools from LoginScreen
2. Update OAuth redirect URLs to production URLs
3. Configure production OAuth credentials
4. Test on production build
5. Monitor authentication logs
6. Set up error tracking

## Getting Help

If issues persist:

1. Check Supabase documentation
2. Review OAuth provider documentation
3. Check Expo documentation for deep linking
4. Monitor console logs for specific error messages
5. Test with debug tools
6. Verify all configuration steps 