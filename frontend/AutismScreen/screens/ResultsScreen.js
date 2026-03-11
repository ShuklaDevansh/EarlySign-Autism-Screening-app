import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator
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

// solid colors for risk badge — white text on colored background
const RISK_COLORS = {
  LOW    : { background: '#2ecc71', border: '#27ae60', text: '#ffffff' },
  MEDIUM : { background: '#f39c12', border: '#e67e22', text: '#ffffff' },
  HIGH   : { background: '#e74c3c', border: '#c0392b', text: '#ffffff' },
};

// plain English labels for feature names
const FEATURE_LABELS = {
  avg_gaze_deviation     : 'Gaze Deviation',
  social_gaze_percentage : 'Social Gaze',
  expression_variance    : 'Facial Expression',
  repetitive_motion_score: 'Repetitive Motion',
};

export default function ResultsScreen({ navigation, route }) {
  const { videoFile, questionnaireScore } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  useEffect(() => {
    callAPI();
  }, []);

  const callAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('video', {
        uri  : videoFile.uri,
        name : videoFile.name,
        type : videoFile.mimeType || 'video/mp4',
      });
      formData.append('questionnaire_score', String(questionnaireScore));

      const response = await axios.post(
        `${API_BASE_URL}/analyze-video`,
        formData,
        {
          headers : { 'Content-Type': 'multipart/form-data' },
          timeout : 300000,
        }
      );
      setResult(response.data);
      await saveToFirestore(response.data, questionnaireScore);
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The video may be too long. Please try a shorter video.');
      } else if (err.response) {
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
      await addDoc(collection(db, 'screenings'), {
        timestamp               : serverTimestamp(),
        risk_level              : resultData.risk_level,
        final_score             : resultData.final_score,
        video_risk_score        : resultData.video_risk_score,
        questionnaire_score     : qScore,
        top_contributing_feature: resultData.top_contributing_feature,
        flags                   : resultData.flags,
      });
      console.log('[Firebase] Session saved successfully');
    } catch (error) {
      console.log('[Firebase] Save failed:', error);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        {/* brain emoji to fill empty space above spinner */}
        <Text style={styles.loadingEmoji}>🧠</Text>
        <Text style={styles.loadingTitle}>Analyzing Video...</Text>
        <ActivityIndicator size="large" color="#1a73e8" style={{ marginVertical: 16 }} />
        <Text style={styles.loadingSubtitle}>
          This takes 1-3 minutes depending on video length.{'\n'}
          Please keep the app open.
        </Text>
        {/* tip card below spinner so screen doesn't look empty */}
        <View style={styles.loadingTipCard}>
          <Text style={styles.loadingTipTitle}>💡 While you wait</Text>
          <Text style={styles.loadingTipText}>
            Our AI is analyzing your child's gaze patterns, facial expressions,
            and movement to generate a risk score.
          </Text>
        </View>
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
  const riskLevel    = result.risk_level;
  const colors       = RISK_COLORS[riskLevel];
  const suggestions  = THERAPY_SUGGESTIONS[riskLevel];
  const scorePercent = Math.round(result.final_score * 100);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Risk Level Badge — solid color, white text, no pale washed look */}
      <View style={[styles.riskBadge, {
        backgroundColor: colors.background,
        borderColor    : colors.border,
      }]}>
        <Text style={styles.riskLabel}>Risk Level</Text>
        <Text style={styles.riskLevel}>{riskLevel}</Text>
        <Text style={styles.riskScore}>Combined Score: {scorePercent}%</Text>
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

      {/* Key Finding */}
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

      {/* Suggested Activities — chip style instead of plain bullets */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Suggested Activities</Text>
        {suggestions.map((suggestion, index) => (
          // each suggestion is its own mini card chip
          <View key={index} style={styles.suggestionChip}>
            <View style={styles.suggestionDot} />
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {/* Doctor recommendation — blue theme, not alarming red */}
      {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
        <View style={styles.consultBox}>
          <Text style={styles.consultTitle}>👨‍⚕️ Professional Evaluation Recommended</Text>
          <Text style={styles.consultText}>
            We recommend consulting a pediatrician or developmental specialist
            for a professional evaluation.
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
    justifyContent: 'center',     // truly centered vertically
    backgroundColor: '#f0f4ff',
    padding: 30,
  },

  // loading
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingTipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 28,
    width: '100%',
    elevation: 2,
  },
  loadingTipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 8,
  },
  loadingTipText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },

  // error
  errorIcon    : { fontSize: 48, marginBottom: 16 },
  errorTitle   : { fontSize: 20, fontWeight: '700', color: '#991b1b', marginBottom: 10 },
  errorMessage : { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryButton  : {
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 12,
    width: '80%',
    alignItems: 'center',
  },
  retryButtonText : { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  backButton      : { marginTop: 8 },
  backButtonText  : { color: '#6b7280', fontSize: 15 },

  // risk badge — solid background, all text white
  riskBadge: {
    borderWidth: 0,               // no border needed with solid background
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  riskLabel : { fontSize: 13, fontWeight: '600', color: '#ffffff', opacity: 0.85, marginBottom: 4 },
  riskLevel : { fontSize: 40, fontWeight: '800', color: '#ffffff', marginBottom: 4, letterSpacing: 1 },
  riskScore : { fontSize: 14, color: '#ffffff', opacity: 0.9 },

  // cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 12,
  },

  // score breakdown
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scoreRowTotal   : { borderBottomWidth: 0, marginTop: 4 },
  scoreLabel      : { fontSize: 14, color: '#6b7280' },
  scoreValue      : { fontSize: 14, color: '#374151', fontWeight: '600' },
  scoreLabelTotal : { fontSize: 14, color: '#374151', fontWeight: '700' },
  scoreValueTotal : { fontSize: 14, color: '#1a73e8', fontWeight: '700' },

  // key finding
  keyFinding: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // flags
  flagText    : { fontSize: 13, color: '#374151', marginBottom: 6, lineHeight: 20 },
  flagWarning : { fontSize: 13, color: '#d97706', marginBottom: 6, lineHeight: 20 },

  // suggestion chips — each activity in its own row with a blue dot
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4ff',  // light blue chip background
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  suggestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a73e8',  // blue dot
    marginTop: 5,
    marginRight: 10,
    flexShrink: 0,
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },

  // consult box — blue theme, not red
  consultBox: {
    backgroundColor: '#e8f0fe',  // light blue background
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',  // blue left border
  },
  consultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 6,
  },
  consultText: { fontSize: 13, color: '#374151', lineHeight: 20 },

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
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
  },
  homeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});