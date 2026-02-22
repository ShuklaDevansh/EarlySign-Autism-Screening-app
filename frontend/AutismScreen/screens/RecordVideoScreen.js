// RecordVideoScreen.js
// This screen will eventually let parents record their child's video.
// For Week 1, it's a placeholder.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function RecordVideoScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record Video</Text>
      <Text style={styles.description}>
        📹 Camera will go here in Week 2.{'\n\n'}
        Parent will record a 3-5 minute video of their child during free play.
      </Text>

      {/* Simulate moving forward in the flow */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Questionnaire')}
      >
        <Text style={styles.buttonText}>Next: Questionnaire →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.notice}>Week 1 - Placeholder Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a56db',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
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
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 10,
  },
  backText: {
    color: '#6b7280',
    fontSize: 16,
  },
  notice: {
    marginTop: 30,
    color: '#9ca3af',
    fontSize: 12,
  },
});