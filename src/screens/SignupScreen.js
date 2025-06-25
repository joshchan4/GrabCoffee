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
import * as Haptics from 'expo-haptics'
import * as WebBrowser from 'expo-web-browser'

export default function SignupScreen({ route, navigation }) {
  const { returnScreen } = route.params || {};
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Please enter your name.')
    }
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Please enter your email address.')
    }
    if (!password || password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Please enter a password (at least 6 characters).')
    }
    
    setLoading(true)

    try {
      // Step 1: Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          }
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Signup failed', authError.message)
        setLoading(false)
        return
      }

      // Step 2: Create profile record in profiles table
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: fullName.trim(),
              email: email.trim(),
              phone: phone.trim() || null,
              address: address.trim() || null,
              created_at: new Date().toISOString(),
            }
          ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't show error to user since auth was successful
          // The profile can be created later when user logs in
        }
      }

      setLoading(false)

      // Step 3: Show success message and redirect
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Account Created Successfully!',
        'Welcome to Grab Coffee!',
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
      console.error('Signup error:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Signup failed', 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'grabcoffee://signup-callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('Google signup error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Google Signup Failed', error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url, 
          'grabcoffee://signup-callback'
        );
        
        if (result.type === 'success') {
          // The user successfully completed the OAuth flow
          console.log('OAuth flow completed successfully');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Check if user is now authenticated
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Create profile for new user
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
                    email: session.user.email,
                    created_at: new Date().toISOString(),
                  }
                ])
                .single();

              if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
                console.error('Profile creation error:', profileError);
              }
            } catch (profileError) {
              console.error('Profile creation error:', profileError);
            }

            Alert.alert(
              'Welcome to Grab Coffee!',
              'Your account has been created successfully with Google.',
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
          }
        } else if (result.type === 'cancel') {
          console.log('OAuth flow was cancelled by user');
        } else {
          console.log('OAuth flow failed:', result);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Google Signup Failed', 'Authentication was cancelled or failed.');
        }
      }
    } catch (error) {
      console.error('Google signup error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Google Signup Failed', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'grabcoffee://signup-callback',
          queryParams: {
            response_mode: 'form_post',
          },
        }
      });

      if (error) {
        console.error('Apple signup error:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Apple Signup Failed', error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url, 
          'grabcoffee://signup-callback'
        );
        
        if (result.type === 'success') {
          // The user successfully completed the OAuth flow
          console.log('OAuth flow completed successfully');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Check if user is now authenticated
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Create profile for new user
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                  {
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
                    email: session.user.email,
                    created_at: new Date().toISOString(),
                  }
                ])
                .single();

              if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
                console.error('Profile creation error:', profileError);
              }
            } catch (profileError) {
              console.error('Profile creation error:', profileError);
            }

            Alert.alert(
              'Welcome to Grab Coffee!',
              'Your account has been created successfully with Apple.',
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
          }
        } else if (result.type === 'cancel') {
          console.log('OAuth flow was cancelled by user');
        } else {
          console.log('OAuth flow failed:', result);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Apple Signup Failed', 'Authentication was cancelled or failed.');
        }
      }
    } catch (error) {
      console.error('Apple signup error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Apple Signup Failed', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
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
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Join Grab Coffee for a better experience</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
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
              <Text style={styles.label}>Password *</Text>
              <Text style={styles.optionalText}>(at least 6 characters)</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.optionalText}>(optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="(123) 456-7890"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Address</Text>
              <Text style={styles.optionalText}>(optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your address"
                placeholderTextColor="#999"
                value={address}
                onChangeText={setAddress}
                editable={!loading}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                (!fullName.trim() || !email.trim() || !password || password.length < 6 || loading) && styles.buttonDisabled,
              ]}
              onPress={handleSignup}
              disabled={!fullName.trim() || !email.trim() || !password || password.length < 6 || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
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
              onPress={handleGoogleSignup}
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
              onPress={handleAppleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.socialButtonContent}>
                <Image source={require('../../assets/apple.png')} style={styles.socialLogo} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text 
                style={styles.switchLink}
                onPress={() => navigation.navigate('Login', { returnScreen })}
              >
                Sign in here
              </Text>
            </Text>
            
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
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
  optionalText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
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
    marginTop: 16,
    lineHeight: 20,
  },
  switchLink: {
    color: '#a0b796',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
    paddingHorizontal: 20,
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
  appleButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
