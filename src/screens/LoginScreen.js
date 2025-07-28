import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Image,
} from 'react-native'
import { supabase } from '../utils/supabase'
import { debugAuth, testOAuthProvider, testUrlScheme, testCompleteOAuthFlow } from '../utils/authDebug'
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'
import 'react-native-url-polyfill/auto'

export default function LoginScreen({ route, navigation }) {
  const { returnScreen } = route.params || {};
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Please enter your email address.')
    }
    if (!password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Please enter your password.')
    }
    
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        console.error('Login error:', error)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login failed', error.message)
        setLoading(false)
        return
      }

      setLoading(false)

      // Success - user is now logged in
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Welcome back!',
        'You have successfully logged in.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to the screen they came from, or go back if no return screen specified
              if (returnScreen) {
                navigation.navigate(returnScreen);
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      )

    } catch (error) {
      console.error('Login error:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login failed', 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting Google OAuth flow...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'grabcoffee://login-callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('❌ Google login error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Google Login Failed', error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        console.log('🌐 Opening OAuth URL in browser...');
        console.log('📱 Expected redirect URL: grabcoffee://login-callback');
        console.log('🔗 Full OAuth URL:', data.url);
        
        try {
          console.log('📱 About to call WebBrowser.openAuthSessionAsync...');
          const result = await WebBrowser.openAuthSessionAsync(
            data.url, 
            'grabcoffee://login-callback'
          );
          console.log('📱 WebBrowser.openAuthSessionAsync completed');
          console.log('📱 OAuth result:', result);
          
          if (result.type === 'success') {
            console.log('✅ OAuth flow completed successfully');
            console.log('🔗 Redirect URL:', result.url);

            try {
              // Extract the URL parameters from the callback URL
              const url = new URL(result.url);
              const code = url.searchParams.get('code');
              
              if (!code) {
                console.error('❌ No authorization code found in callback URL');
                Alert.alert('Login Error', 'No authorization code received from Google.');
                return;
              }

              console.log('🔑 Authorization code extracted:', code.substring(0, 20) + '...');

              // Exchange the code for a session
              const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);

              if (exchangeError) {
                console.error('❌ Failed to exchange code for session:', exchangeError);
                Alert.alert('Login Error', `Authentication failed: ${exchangeError.message}`);
                return;
              }
              
              if (sessionData?.session) {
                console.log('✅ Session created successfully:', sessionData.session.user.email);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                Alert.alert(
                  'Welcome back!',
                  'You have successfully logged in with Google.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (returnScreen) {
                          navigation.navigate(returnScreen);
                        } else {
                          navigation.goBack();
                        }
                      }
                    }
                  ]
                );
              } else {
                console.log('⚠️ No session in exchange response');
                Alert.alert('Login Error', 'Authentication completed but no session was created.');
              }
            } catch (urlError) {
              console.error('❌ Error processing callback URL:', urlError);
              Alert.alert('Login Error', 'Failed to process authentication response.');
            }
            
          } else if (result.type === 'cancel') {
            console.log('❌ OAuth flow was cancelled by user');
            Alert.alert('Login Cancelled', 'You cancelled the Google login process.');
          } else {
            console.log('❌ OAuth flow failed:', result);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Google Login Failed', 'Authentication was cancelled or failed. Please try again.');
          }
        } catch (browserError) {
          console.error('❌ WebBrowser error:', browserError);
          Alert.alert('Browser Error', 'Failed to open authentication browser. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        console.error('❌ No OAuth URL received');
        Alert.alert('Google Login Failed', 'No authentication URL was generated.');
      }
    } catch (error) {
      console.error('❌ Google login exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Google Login Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting Apple OAuth flow...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'grabcoffee://login-callback',
          queryParams: {
            response_mode: 'form_post',
          },
        }
      });

      if (error) {
        console.error('❌ Apple login error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Apple Login Failed', error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        console.log('🌐 Opening OAuth URL in browser...');
        console.log('📱 Expected redirect URL: grabcoffee://login-callback');
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url, 
          'grabcoffee://login-callback'
        );
        
        console.log('📱 OAuth result:', result);
        
        if (result.type === 'success') {
          console.log('✅ OAuth flow completed successfully');
          console.log('🔗 Redirect URL:', result.url);

          try {
            // Extract the URL parameters from the callback URL
            const url = new URL(result.url);
            const code = url.searchParams.get('code');
            
            if (!code) {
              console.error('❌ No authorization code found in callback URL');
              Alert.alert('Login Error', 'No authorization code received from Apple.');
              return;
            }

            console.log('🔑 Authorization code extracted:', code.substring(0, 20) + '...');

            // Exchange the code for a session
            const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);

            if (exchangeError) {
              console.error('❌ Failed to exchange code for session:', exchangeError);
              Alert.alert('Login Error', `Authentication failed: ${exchangeError.message}`);
              return;
            }
            
            if (sessionData?.session) {
              console.log('✅ Session created successfully:', sessionData.session.user.email);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              Alert.alert(
                'Welcome back!',
                'You have successfully logged in with Apple.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (returnScreen) {
                        navigation.navigate(returnScreen);
                      } else {
                        navigation.goBack();
                      }
                    }
                  }
                ]
              );
            } else {
              console.log('⚠️ No session in exchange response');
              Alert.alert('Login Error', 'Authentication completed but no session was created.');
            }
          } catch (urlError) {
            console.error('❌ Error processing callback URL:', urlError);
            Alert.alert('Login Error', 'Failed to process authentication response.');
          }
          
        } else if (result.type === 'cancel') {
          console.log('❌ OAuth flow was cancelled by user');
          Alert.alert('Login Cancelled', 'You cancelled the Apple login process.');
        } else {
          console.log('❌ OAuth flow failed:', result);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Apple Login Failed', 'Authentication was cancelled or failed. Please try again.');
        }
      } else {
        console.error('❌ No OAuth URL received');
        Alert.alert('Apple Login Failed', 'No authentication URL was generated.');
      }
    } catch (error) {
      console.error('❌ Apple login exception:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Apple Login Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDebugAuth = async () => {
    console.log('🔍 Starting debug...');
    await debugAuth();
    Alert.alert('Debug Complete', 'Check console for authentication debug information.');
  };

  const handleTestGoogleOAuth = async () => {
    console.log('🔍 Testing Google OAuth...');
    const result = await testOAuthProvider('google');
    if (result.success) {
      Alert.alert('Google OAuth Test', 'Google OAuth URL generated successfully. Check console for details.');
    } else {
      Alert.alert('Google OAuth Test Failed', `Error: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleTestAppleOAuth = async () => {
    console.log('🔍 Testing Apple OAuth...');
    const result = await testOAuthProvider('apple');
    if (result.success) {
      Alert.alert('Apple OAuth Test', 'Apple OAuth URL generated successfully. Check console for details.');
    } else {
      Alert.alert('Apple OAuth Test Failed', `Error: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleTestUrlScheme = async () => {
    console.log('🔍 Testing URL Scheme...');
    const result = await testUrlScheme();
    if (result.success) {
      Alert.alert('URL Scheme Test', 'URL Scheme test completed successfully. Check console for details.');
    } else {
      Alert.alert('URL Scheme Test Failed', `Error: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleTestCompleteOAuthFlow = async (provider) => {
    console.log(`🔍 Testing complete ${provider} OAuth flow...`);
    const result = await testCompleteOAuthFlow(provider);
    if (result.success) {
      Alert.alert(
        `${provider} OAuth Test`, 
        `OAuth URL generated successfully.\nCan open grabcoffee:// URLs: ${result.canOpen}\n\nCheck console for the OAuth URL.`
      );
    } else {
      Alert.alert(`${provider} OAuth Test Failed`, `Error: ${result.error?.message || 'Unknown error'}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subheading}>Sign in to your Grab Coffee account</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                (!email.trim() || !password || loading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!email.trim() || !password || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                handleGoogleLogin();
              }}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <Image source={require('../../assets/google.png')} style={styles.socialLogo} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.appleButton}
              onPress={() => {
                handleAppleLogin();
              }}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <Image source={require('../../assets/apple.png')} style={styles.socialLogo} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text 
                style={styles.switchLink}
                onPress={() => navigation.navigate('Signup', { returnScreen })}
              >
                Sign up here
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 30,
  },
  backBtn: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  backText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#333',
    minHeight: 50,
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#a0b796',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  switchLink: {
    color: '#a0b796',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialLogo: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  appleButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  appleButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}) 