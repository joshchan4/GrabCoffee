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
} from 'react-native'
import { supabase } from '../utils/supabase'

export default function SignupScreen({ route, navigation }) {
  const { name } = route.params || {}
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Please enter email and password.')
    }
    setLoading(true)

    const { error } = await supabase.auth.signUp(
      { email, password },
      { data: { full_name: name } }
    )
    setLoading(false)

    if (error) {
      return Alert.alert('Signup failed', error.message)
    }

    Alert.alert(
      'Account created!',
      'Check your email to confirm your account.'
    )
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Create Account</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          editable={false}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!email.trim() || !password || loading) && styles.buttonDisabled,
          ]}
          onPress={handleSignup}
          disabled={!email.trim() || !password || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating…' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  container:     { flex: 1, padding: 20, backgroundColor: '#fff' },
  backBtn: {
    marginTop: 16,
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  backText: {
    color: '#a8e4a0',
    fontSize: 16,
    fontWeight: '600',
  },
  heading:       { fontSize: 26, fontWeight: '700', marginBottom: 24, color: '#333', letterSpacing: -0.5 },
  label:         { marginTop: 14, fontWeight: '600', color: '#444', fontSize: 15 },
  input:         { borderWidth: 1, borderColor: '#cdd7ce', borderRadius: 8, padding: 12, marginTop: 6, backgroundColor: '#fff', fontSize: 15 },
  button:        { backgroundColor: '#a8e4a0', marginTop: 32, padding: 16, borderRadius: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  buttonDisabled:{ backgroundColor: '#ccc' },
  buttonText:    { color: '#fff', fontSize: 17, fontWeight: '700' },
})
