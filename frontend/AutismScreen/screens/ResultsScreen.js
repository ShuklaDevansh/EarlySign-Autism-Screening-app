import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// hardcoded therapy suggestions per risk level
const THERAPY_SUGGESTIONS = {
  LOW: [
    "Continue regular playtime with age-appropriate toys",
    "Read books together daily — point at pictures and name them",
    "Encourage turn-taking games like rolling a ball back and forth",
    "Sing songs with actions like 'Wheels on the Bus'",
    "Schedule regular playdates with other children",
  ],
  MEDIUM: [
    "Practice eye contact games — hold a toy near your face and wait for eye contact",
    "Play peek-a-boo regularly to build joint attention",
    "Narrate your actions out loud during daily routines",
    "Point at objects and wait for your child to look before naming them",
    "Consider a developmental check-up with your pediatrician",
    "Try structured play sessions of 15-20 minutes daily",
  ],
  HIGH: [
    "Consult a pediatric neurologist or developmental pediatrician promptly",
    "Request a formal developmental assessment from your doctor",
    "Practice responding to name — call name gently and reward any response",
    "Use simple one-word instructions consistently",
    "Join a parent support group for early intervention guidance",
    "Contact your local early intervention program for professional support",
  ],
};

// colors for each risk level
const RISK_COLORS = {
  LOW    : { background: '#ecfdf5', border: '#10b981', text: '#065f46' },
  MEDIUM : { background: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  HIGH   : { background: '#fef2f2', border: '#ef4444', text: '#991b1b' },
};

// plain English labels for feature names
const FEATURE_LABELS = {
  avg_gaze_deviation     : 'Gaze Deviation',
  social_gaze_percentage : 'Social Gaze',
  expression_variance    : 'Facial Expression',
  repetitive_motion_score: 'Repetitive Motion',
};

export default function ResultsScreen({ navigation, route }) {
  // receive video and questionnaire score from QuestionnaireScreen
  const { videoFile, questionnaireScore } = route.params || {};

  // state variables
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);

  // call the API as soon as the screen loads
  useEffect(() => {
    callAPI();
  }, []);

  const callAPI = async () => {
    setLoading(true);
    setError(null);

    try {
      // build multipart form data — same format as Postman test
      const formData = new FormData();

      // append video file
      formData.append('video', {
        uri  : videoFile.uri,
        name : videoFile.name,
        type : videoFile.mimeType || 'video/mp4',
      });

      // append questionnaire score as string
      formData.append('questionnaire_score', String(questionnaireScore));

      // send POST request to Render backend
      const response = await axios.post(
        `${API_BASE_URL}/analyze-video`,
        formData,
        {
          headers : { 'Content-Type': 'multipart/form-data' },
          timeout : 300000, // 5 minutes — video processing takes time
        }
      );

      setResult(response.data);

      await saveToFirestore(response.data, questionnaireScore);

    } catch (err) {
      // handle different error types clearly
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The video may be too long. Please try a shorter video.');
      } else if (err.response) {
        // server responded with an error code
        setError(`Server error: ${err.response.status}. ${err.response.data?.detail || ''}`);
      } else {
        setError('Could not connect to server. Check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToFirestore = async (resultData, qScore) => {
  try {
    // save session result to Firebase Firestore
    await addDoc(collection(db, 'screenings'), {
      timestamp              : serverTimestamp(),
      risk_level             : resultData.risk_level,
      final_score            : resultData.final_score,
      video_risk_score       : resultData.video_risk_score,
      questionnaire_score    : qScore,
      top_contributing_feature: resultData.top_contributing_feature,
      flags                  : resultData.flags,
    });
    console.log('[Firebase] Session saved successfully');
  } catch (error) {
    // don't crash the app if Firebase save fails — just log it
    console.log('[Firebase] Save failed:', error);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1a56db" />
        <Text style={styles.loadingTitle}>Analyzing Video...</Text>
        <Text style={styles.loadingSubtitle}>
          This takes 1-3 minutes depending on video length.{'\n'}
          Please keep the app open.
        </Text>
      </View>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={callAPI}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Results State ---
  const riskLevel   = result.risk_level;
  const colors      = RISK_COLORS[riskLevel];
  const suggestions = THERAPY_SUGGESTIONS[riskLevel];
  const scorePercent = Math.round(result.final_score * 100);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>Screening Results</Text>

      {/* Risk Level Badge */}
      <View style={[styles.riskBadge, {
        backgroundColor: colors.background,
        borderColor    : colors.border,
      }]}>
        <Text style={[styles.riskLabel, { color: colors.text }]}>Risk Level</Text>
        <Text style={[styles.riskLevel, { color: colors.text }]}>{riskLevel}</Text>
        <Text style={[styles.riskScore, { color: colors.text }]}>
          Combined Score: {scorePercent}%
        </Text>
      </View>

      {/* Score Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Score Breakdown</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Video Analysis</Text>
          <Text style={styles.scoreValue}>
            {Math.round(result.video_risk_score * 100)}%
          </Text>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Questionnaire</Text>
          <Text style={styles.scoreValue}>
            {Math.round(result.questionnaire_score_normalized * 100)}%
          </Text>
        </View>
        <View style={[styles.scoreRow, styles.scoreRowTotal]}>
          <Text style={styles.scoreLabelTotal}>Combined Score</Text>
          <Text style={styles.scoreValueTotal}>{scorePercent}%</Text>
        </View>
      </View>

      {/* Top Contributing Feature */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔍 Key Finding</Text>
        <Text style={styles.keyFinding}>
          {FEATURE_LABELS[result.top_contributing_feature]} was the strongest
          signal in this screening.
        </Text>
      </View>

      {/* Flags */}
      {(result.flags.low_social_gaze ||
        result.flags.flat_expression ||
        result.flags.high_repetitive_motion ||
        result.flags.insufficient_frames ||
        result.flags.wrist_not_visible) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚩 Flags Detected</Text>
          {result.flags.low_social_gaze && (
            <Text style={styles.flagText}>• Low social gaze detected</Text>
          )}
          {result.flags.flat_expression && (
            <Text style={styles.flagText}>• Reduced facial expression variation</Text>
          )}
          {result.flags.high_repetitive_motion && (
            <Text style={styles.flagText}>• High repetitive motion detected</Text>
          )}
          {result.flags.insufficient_frames && (
            <Text style={styles.flagWarning}>
              ⚠️ Video too short — results may be less reliable
            </Text>
          )}
          {result.flags.wrist_not_visible && (
            <Text style={styles.flagWarning}>
              ⚠️ Motion data unavailable — wrists not visible in video
            </Text>
          )}
        </View>
      )}

      {/* Therapy Suggestions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Suggested Activities</Text>
        {suggestions.map((suggestion, index) => (
          <Text key={index} style={styles.suggestionText}>
            • {suggestion}
          </Text>
        ))}
      </View>

      {/* Doctor recommendation for medium and high */}
      {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
        <View style={styles.consultBox}>
          <Text style={styles.consultText}>
            👨‍⚕️ We recommend consulting a pediatrician or developmental
            specialist for a professional evaluation.
          </Text>
        </View>
      )}

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        This is a screening tool only, not a medical diagnosis.
        Results should be reviewed by a qualified healthcare professional.
      </Text>

      {/* Back to Home */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f4ff',
    padding: 16,
    paddingTop: 24,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a56db',
    textAlign: 'center',
    marginBottom: 20,
  },
  // loading
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a56db',
    marginTop: 20,
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  // error
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 12,
    width: '80%',
    alignItems: 'center',
  },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 8 },
  backButtonText: { color: '#6b7280', fontSize: 15 },
  // risk badge
  riskBadge: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  riskLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  riskLevel: { fontSize: 36, fontWeight: 'bold', marginBottom: 4 },
  riskScore: { fontSize: 14 },
  // cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a56db',
    marginBottom: 12,
  },
  // score breakdown
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scoreRowTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  scoreLabel      : { fontSize: 14, color: '#6b7280' },
  scoreValue      : { fontSize: 14, color: '#374151', fontWeight: '600' },
  scoreLabelTotal : { fontSize: 14, color: '#374151', fontWeight: '700' },
  scoreValueTotal : { fontSize: 14, color: '#1a56db', fontWeight: '700' },
  // key finding
  keyFinding: { fontSize: 14, color: '#374151', lineHeight: 22 },
  // flags
  flagText    : { fontSize: 13, color: '#374151', marginBottom: 6 },
  flagWarning : { fontSize: 13, color: '#d97706', marginBottom: 6 },
  // suggestions
  suggestionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 6,
  },
  // consult box
  consultBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  consultText: { fontSize: 14, color: '#991b1b', lineHeight: 22 },
  // disclaimer
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  // home button
  homeButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
  },
  homeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});