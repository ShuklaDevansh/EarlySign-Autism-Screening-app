// QuestionnaireScreen.js
// This screen will show all 20 M-CHAT-R questions.
// For Week 1, it's a placeholder.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function QuestionnaireScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Questionnaire</Text>
      <Text style={styles.description}>
        📋 20 M-CHAT-R questions will go here in Week 3.{'\n\n'}
        Parents will answer Yes/No questions about their child's behavior and development.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Results')}
      >
        <Text style={styles.buttonText}>Next: View Results →</Text>
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
  backButton: { marginTop: 10 },
  backText: { color: '#6b7280', fontSize: 16 },
  notice: { marginTop: 30, color: '#9ca3af', fontSize: 12 },
});