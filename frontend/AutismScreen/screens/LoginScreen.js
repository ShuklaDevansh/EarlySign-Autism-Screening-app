import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isLogin,  setIsLogin]  = useState(true);
  const [loading,  setLoading]  = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      // navigation happens automatically via auth state listener in App.js
    } catch (error) {
      const messages = {
        'auth/user-not-found'   : 'No account found with this email.',
        'auth/wrong-password'   : 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email'    : 'Please enter a valid email address.',
        'auth/invalid-credential': 'Incorrect email or password.',
      };
      Alert.alert('Error', messages[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        <Text style={styles.logo}>🧠</Text>
        <Text style={styles.title}>EarlySign</Text>
        <Text style={styles.subtitle}>AI-Enabled Autism Screening</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggle}>
            {isLogin
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your data is stored securely and never shared.
        </Text>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a73e8',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#f9fafb',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggle: {
    color: '#1a73e8',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  disclaimer: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 12,
  },
});