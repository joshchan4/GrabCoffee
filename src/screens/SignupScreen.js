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
} from 'react-native'
import { supabase } from '../utils/supabase'

export default function SignupScreen({ route, navigation }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName.trim()) {
      return Alert.alert('Please enter your name.')
    }
    if (!email.trim()) {
      return Alert.alert('Please enter your email address.')
    }
    if (!password || password.length < 6) {
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

      // Step 3: Show success message
      Alert.alert(
        'Account Created Successfully!',
        'Please check your email to verify your account before signing in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )

    } catch (error) {
      console.error('Signup error:', error)
      Alert.alert('Signup failed', 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

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
    color: '#a8e4a0',
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
    backgroundColor: '#a8e4a0',
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
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
})
