import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';



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
  head_pose              : 'Head Orientation',
};

export default function ResultsScreen({ navigation, route }) {
  const { videoFile, questionnaireScore } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [result,  setResult]  = useState(null);

  // modal state — controls visibility, explanation text, and loading inside modal
  const [modalVisible,   setModalVisible]   = useState(false);
  const [explanation,    setExplanation]    = useState('');
  const [explainLoading, setExplainLoading] = useState(false);

  // pdf button loading state
  const [pdfLoading, setPdfLoading] = useState(false);

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
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      await addDoc(collection(db, 'users', userId, 'sessions'), {
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

  // calls /explain endpoint and opens modal with plain-english paragraph
  const fetchExplanation = async (resultData) => {
    setModalVisible(true);
    setExplainLoading(true);
    try {
      // build GET url with all result values as query parameters
      const url =
        `${API_BASE_URL}/explain` +
        `?risk_level=${resultData.risk_level}` +
        `&top_feature=${resultData.top_contributing_feature}` +
        `&social_gaze=${resultData.raw_features.social_gaze_percentage}` +
        `&expression_var=${resultData.raw_features.expression_variance}` +
        `&rep_motion=${resultData.raw_features.repetitive_motion_score}` +
        `&frames=${resultData.meta.frames_processed}` +
        `&questionnaire_score=${Math.round(resultData.questionnaire_score_normalized * 20)}` +
        `&final_score=${resultData.final_score}`;
      const response = await axios.get(url, { timeout: 15000 });
      // store the explanation text from API
      setExplanation(response.data.explanation);
    } catch (e) {
      // fallback message if explain call fails
      setExplanation('Explanation could not be loaded. Please try again.');
    } finally {
      setExplainLoading(false);
    }
  };

  // builds HTML string from result data, converts to PDF, opens share sheet
  const generateAndSharePDF = async () => {
    setPdfLoading(true);
    try {
      const riskLevel     = result.risk_level;
      const scorePercent  = Math.round(result.final_score * 100);
      const videoPercent  = Math.round(result.video_risk_score * 100);
      const qPercent      = Math.round(result.questionnaire_score_normalized * 100);
      const screeningDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      // badge color based on risk level
      const badgeColor =
        riskLevel === 'LOW'    ? '#2ecc71' :
        riskLevel === 'MEDIUM' ? '#f39c12' : '#e74c3c';

      // feature rows for the table — show N/A when value is null
      const featureRows = [
        { label: 'Gaze Deviation',    key: 'avg_gaze_deviation' },
        { label: 'Social Gaze',       key: 'social_gaze_percentage' },
        { label: 'Facial Expression', key: 'expression_variance' },
        { label: 'Repetitive Motion', key: 'repetitive_motion_score' },
        { label: 'Head Orientation',  key: 'head_pose' },
      ].map(f => {
        const val = result.feature_contributions?.[f.key];
        const display = val === null || val === undefined
          ? 'N/A'
          : `${Math.round(val * 100)}%`;
        return `
          <tr>
            <td>${f.label}</td>
            <td>${display}</td>
          </tr>`;
      }).join('');

      // build triggered flags as bullet list — only show flags that are true
      const flagMap = {
        low_social_gaze        : 'Low social gaze detected',
        flat_expression        : 'Reduced facial expression variation',
        high_repetitive_motion : 'High repetitive motion detected',
        head_avoidance         : 'Head frequently turned away from camera',
        insufficient_frames    : 'Video too short — results may be less reliable',
        wrist_not_visible      : 'Motion data unavailable — wrists not visible in video',
      };
      const triggeredFlags = Object.entries(result.flags || {})
        .filter(([, v]) => v === true)
        .map(([k]) => `<li>${flagMap[k] || k}</li>`)
        .join('');
      const flagsSection = triggeredFlags
        ? `<ul>${triggeredFlags}</ul>`
        : '<p style="color:#6b7280;">No flags detected.</p>';

      // suggestions as bullet list
      const suggestionsList = (result.suggestions || [])
        .map(s => `<li>${s}</li>`)
        .join('');

      // full HTML for the PDF — single page, clean clinical look
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #1f2937;
              padding: 32px;
              font-size: 14px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1a73e8;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .app-name {
              font-size: 26px;
              font-weight: 800;
              color: #1a73e8;
            }
            .app-subtitle {
              font-size: 12px;
              color: #6b7280;
              margin-top: 2px;
            }
            .report-date {
              font-size: 12px;
              color: #6b7280;
              text-align: right;
            }
            .badge {
              display: inline-block;
              background-color: ${badgeColor};
              color: #ffffff;
              font-size: 22px;
              font-weight: 800;
              padding: 8px 28px;
              border-radius: 8px;
              letter-spacing: 1px;
            }
            .risk-section {
              text-align: center;
              margin-bottom: 28px;
              padding: 20px;
              background: #f0f4ff;
              border-radius: 10px;
            }
            .risk-label {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .combined-score {
              font-size: 13px;
              color: #374151;
              margin-top: 8px;
            }
            h2 {
              font-size: 15px;
              font-weight: 700;
              color: #1a73e8;
              border-left: 4px solid #1a73e8;
              padding-left: 10px;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
            }
            th {
              background-color: #1a73e8;
              color: #ffffff;
              padding: 8px 12px;
              text-align: left;
              font-size: 13px;
            }
            td {
              padding: 8px 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            tr:nth-child(even) td {
              background-color: #f9fafb;
            }
            ul {
              padding-left: 20px;
              margin: 0;
            }
            li {
              margin-bottom: 6px;
              font-size: 13px;
            }
            .disclaimer {
              margin-top: 32px;
              padding: 14px;
              background: #fff7ed;
              border: 1px solid #fed7aa;
              border-radius: 8px;
              font-size: 11px;
              color: #92400e;
              line-height: 1.5;
            }
            .footer {
              margin-top: 20px;
              font-size: 11px;
              color: #9ca3af;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>

          <div class="header">
            <div>
              <div class="app-name">EarlySign</div>
              <div class="app-subtitle">AI-Enabled Early Autism Screening Platform</div>
            </div>
            <div class="report-date">
              Screening Report<br/>
              ${screeningDate}
            </div>
          </div>

          <div class="risk-section">
            <div class="risk-label">RISK LEVEL</div>
            <div class="badge">${riskLevel}</div>
            <div class="combined-score">Combined Score: ${scorePercent}%</div>
          </div>

          <h2>Score Breakdown</h2>
          <table>
            <tr><th>Component</th><th>Score</th></tr>
            <tr><td>Video Analysis</td><td>${videoPercent}%</td></tr>
            <tr><td>Questionnaire (M-CHAT-R)</td><td>${qPercent}%</td></tr>
            <tr><td><strong>Combined Score</strong></td><td><strong>${scorePercent}%</strong></td></tr>
          </table>

          <h2>Key Finding</h2>
          <p>
            <strong>${FEATURE_LABELS[result.top_contributing_feature] || result.top_contributing_feature}</strong>
            was the strongest signal in this screening.
          </p>

          <h2>Feature Contributions</h2>
          <table>
            <tr><th>Feature</th><th>Risk Contribution</th></tr>
            ${featureRows}
          </table>

          <h2>Flags Detected</h2>
          ${flagsSection}

          <h2>Suggested Activities</h2>
          <ul>${suggestionsList}</ul>

          ${(result.risk_level === 'MEDIUM' || result.risk_level === 'HIGH') ? `
          <div style="
            background: #e8f0fe;
            border-left: 4px solid #1a73e8;
            border-radius: 8px;
            padding: 14px 16px;
            margin-top: 20px;
          ">
            <strong style="color:#1a73e8;">Professional Evaluation Recommended</strong>
            <p style="margin: 6px 0 0 0; color:#374151; font-size:13px;">
              We recommend consulting a paediatrician or developmental specialist
              for a formal clinical evaluation based on these screening results.
            </p>
          </div>` : ''}

          <div class="disclaimer">
            <strong>Important Disclaimer:</strong> EarlySign is a screening tool only.
            It does not diagnose Autism Spectrum Disorder or any other medical condition.
            All results are indicative only and must be reviewed by a qualified paediatric
            healthcare professional. This is an academic prototype that has not undergone
            clinical trials and is not cleared for medical use by any regulatory body.
          </div>

          <div class="footer">
            Generated by EarlySign &mdash; Academic B.Tech Project &mdash; Not for clinical use
          </div>

        </body>
        </html>
      `;

      // convert HTML to PDF file — expo-print saves it to a temp path on device
      const { uri } = await Print.printToFileAsync({ html });

      // open the phone's native share sheet with the PDF file
      await Sharing.shareAsync(uri, {
        mimeType : 'application/pdf',
        dialogTitle: 'Save or Share EarlySign Report',
      });

    } catch (e) {
      console.log('[PDF] Generation failed:', e);
    } finally {
      setPdfLoading(false);
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
  const suggestions = result.suggestions || [];
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

      {/* Explain This Result button — sits right below the risk badge */}
      <TouchableOpacity
        style={styles.explainButton}
        onPress={() => fetchExplanation(result)}
      >
        <Text style={styles.explainButtonText}>💡 Explain This Result</Text>
      </TouchableOpacity>

      {/* Download Report button — sits below Explain button */}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={generateAndSharePDF}
        disabled={pdfLoading}
      >
        {pdfLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.downloadButtonText}>📄 Download Report (PDF)</Text>
        )}
      </TouchableOpacity>

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
        result.flags.wrist_not_visible ||
        result.flags.head_avoidance) && (
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
          {result.flags.head_avoidance && (
            <Text style={styles.flagText}>• Head frequently turned away from camera</Text>
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

      {/* Explanation Modal — slides up from bottom when Explain button is tapped */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What This Result Means</Text>

            {explainLoading ? (
              // spinner while fetching explanation from API
              <ActivityIndicator size="large" color="#1a73e8" style={{ marginVertical: 20 }} />
            ) : (
              <>
                {/* plain english paragraph from /explain endpoint */}
                <Text style={styles.modalText}>{explanation}</Text>

                {/* bar chart title */}
                <Text style={styles.chartTitle}>Feature Contributions</Text>

                {/* simple bar chart — one row per feature, width = contribution % */}
                {[
                  { label: 'Gaze Deviation', value: result?.feature_contributions?.avg_gaze_deviation ?? 0 },
                  { label: 'Social Gaze',    value: result?.feature_contributions?.social_gaze_percentage ?? 0 },
                  { label: 'Expression',     value: result?.feature_contributions?.expression_variance ?? 0 },
                  { label: 'Rep. Motion',    value: result?.feature_contributions?.repetitive_motion_score ?? 0 },
                ].map((item) => (
                  <View key={item.label} style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.label}</Text>
                    <View style={styles.barBackground}>
                      {/* bar width is proportional to feature value 0.0-1.0 */}
                      <View style={[
                        styles.barFill,
                        { width: item.value === null ? '0%' : `${Math.round(item.value * 100)}%` }
                      ]} />
                    </View>
                    <Text style={styles.barValue}>
                      {item.value === null ? 'N/A' : `${Math.round(item.value * 100)}%`}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* close button at bottom of modal */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    borderWidth: 0,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  riskLabel : { fontSize: 13, fontWeight: '600', color: '#ffffff', opacity: 0.85, marginBottom: 4 },
  riskLevel : { fontSize: 40, fontWeight: '800', color: '#ffffff', marginBottom: 4, letterSpacing: 1 },
  riskScore : { fontSize: 14, color: '#ffffff', opacity: 0.9 },

  // explain button — white with blue border, sits below risk badge
  explainButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  explainButtonText: {
    color: '#1a73e8',
    fontWeight: '600',
    fontSize: 15,
  },

  // download button — solid green, sits below explain button
  downloadButton: {
    backgroundColor: '#0f9d58',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },

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

  // suggestion chips
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  suggestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a73e8',
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

  // consult box
  consultBox: {
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
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

  // modal overlay — dark semi-transparent background
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  // modal card — slides up from bottom
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 14,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  // one row in the bar chart
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 90,
    fontSize: 12,
    color: '#6b7280',
  },
  barBackground: {
    flex: 1,
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: '#1a73e8',
    borderRadius: 5,
  },
  barValue: {
    width: 40,
    fontSize: 12,
    color: '#1a1a2e',
    textAlign: 'right',
  },
  // close button at bottom of modal
  closeButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});