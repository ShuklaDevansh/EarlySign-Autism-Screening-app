// HomeScreen.js
// This is the first screen the parent sees when they open the app.
// For now it's a placeholder - we'll build the real UI in later weeks.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  // 'navigation' is passed automatically by React Navigation
  // It's how we move to other screens

  return (
    <View style={styles.container}>
      {/* App Title */}
      <Text style={styles.title}>Autism Screening App</Text>
      <Text style={styles.subtitle}>Early Risk Detection for Children</Text>

      {/* Start Screening Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('RecordVideo')}
        // navigation.navigate('ScreenName') moves to that screen
      >
        <Text style={styles.buttonText}>Start Screening</Text>
      </TouchableOpacity>

      {/* View History Button */}
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.buttonText}>View History</Text>
      </TouchableOpacity>

      {/* Placeholder notice */}
      <Text style={styles.notice}>Week 1 - Placeholder Screen</Text>
    </View>
  );
}

// StyleSheet is React Native's way of writing CSS-like styles
const styles = StyleSheet.create({
  container: {
    flex: 1,                    // Take up full screen height
    alignItems: 'center',       // Center horizontally
    justifyContent: 'center',   // Center vertically
    backgroundColor: '#f0f4ff', // Light blue background
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a56db',           // Blue color
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#1a56db',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#374151',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  notice: {
    marginTop: 30,
    color: '#9ca3af',
    fontSize: 12,
  },
});