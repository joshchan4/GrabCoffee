import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
    <View style={styles.container}>
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
)

}

const styles = StyleSheet.create({
  container:     { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading:       { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label:         { marginTop: 12, fontWeight: '600' },
  input:         { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginTop: 4 },
  button:        { backgroundColor: '#6b4a3e', marginTop: 24, padding: 12, borderRadius: 6, alignItems: 'center' },
  buttonDisabled:{ backgroundColor: '#ccc' },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: '600' },
})
