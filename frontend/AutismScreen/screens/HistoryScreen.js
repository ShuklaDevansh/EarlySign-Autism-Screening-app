// HistoryScreen.js
// This screen will show past screening sessions.
// For Week 1, it's a placeholder with dummy data.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// Dummy data to show what the history will look like
const DUMMY_HISTORY = [
  { id: 1, date: '2026-02-10', childName: 'Child A', riskLevel: 'LOW', riskColor: '#10b981' },
  { id: 2, date: '2026-02-15', childName: 'Child B', riskLevel: 'MEDIUM', riskColor: '#f59e0b' },
  { id: 3, date: '2026-02-20', childName: 'Child C', riskLevel: 'HIGH', riskColor: '#ef4444' },
];

export default function HistoryScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screening History</Text>
      <Text style={styles.subtitle}>Past sessions will load from Firebase (Week 6)</Text>

      {/* Show dummy history cards */}
      <ScrollView style={styles.list}>
        {DUMMY_HISTORY.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.childName}>{session.childName}</Text>
              <Text style={styles.date}>{session.date}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: session.riskColor }]}>
              <Text style={styles.badgeText}>{session.riskLevel}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.notice}>Week 1 - Placeholder with dummy data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a56db',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 25,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,  // Shadow on Android
  },
  cardLeft: {},
  childName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  date: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  backButton: { marginTop: 15, alignItems: 'center' },
  backText: { color: '#6b7280', fontSize: 16 },
  notice: { textAlign: 'center', marginTop: 10, color: '#9ca3af', fontSize: 12 },
});