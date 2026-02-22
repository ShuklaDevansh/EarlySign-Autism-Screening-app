// ResultsScreen.js
// This screen will show the final risk score and therapy suggestions.
// For Week 1, it's a placeholder.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ResultsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Results</Text>

      {/* Placeholder risk badge */}
      <View style={styles.riskBadge}>
        <Text style={styles.riskText}>MEDIUM RISK</Text>
        <Text style={styles.riskNote}>(Placeholder - Real score in Week 4)</Text>
      </View>

      <Text style={styles.description}>
        📊 This screen will show:{'\n'}
        • Combined risk score (video + questionnaire){'\n'}
        • Which behavioral signals were flagged{'\n'}
        • Therapy suggestions{'\n'}
        • Doctor consultation recommendation
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.buttonText}>Back to Home</Text>
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
  riskBadge: {
    backgroundColor: '#fef3c7',   // Yellow for medium risk
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    width: '80%',
  },
  riskText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d97706',
  },
  riskNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 5,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 28,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#1a56db',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  notice: { marginTop: 30, color: '#9ca3af', fontSize: 12 },
});