import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, TextInput, Alert
} from 'react-native';

// age bracket definitions — determines which questionnaire to use
const getAgeBracket = (totalMonths) => {
  if (totalMonths < 16)  return 'too_young';
  if (totalMonths <= 30) return 'mchat';       // 16–30 months — M-CHAT-R validated range
  if (totalMonths <= 47) return 'mchat_caution'; // 31–47 months — M-CHAT-R with caveat
  return 'scq';                                 // 48 months+ (4 years+) — SCQ validated range
};

// info card content for each bracket
const BRACKET_INFO = {
  too_young: {
    color   : '#6366f1',
    icon    : '👶',
    title   : 'Under 16 Months',
    body    : 'There is currently no validated parent-report screening questionnaire for children under 16 months. '
            + 'Subtle early markers at this age require direct clinical observation by a trained specialist.\n\n'
            + 'We recommend speaking directly with your paediatrician if you have concerns about your child\'s development.',
    canContinue: false,
  },
  mchat: {
    color   : '#10b981',
    icon    : '✅',
    title   : 'M-CHAT-R — Validated Range',
    body    : 'Your child\'s age (16–30 months) falls within the clinically validated range for the '
            + 'Modified Checklist for Autism in Toddlers, Revised (M-CHAT-R).\n\n'
            + 'This is the gold-standard parent-report screening tool for this age group, '
            + 'with validated sensitivity of 0.91 and specificity of 0.95.',
    canContinue: true,
    questionnaireType: 'mchat',
    questionnaireName: 'M-CHAT-R (20 questions)',
  },
  mchat_caution: {
    color   : '#f59e0b',
    icon    : '⚠️',
    title   : 'Age Gap — Limited Tool Availability',
    body    : 'Your child\'s age (31–47 months) falls in a clinically underserved gap. '
            + 'The M-CHAT-R is formally validated up to 30 months. No widely available '
            + 'parent-report tool has been validated for exactly this window.\n\n'
            + 'We will use M-CHAT-R with a caution note. Results should be interpreted '
            + 'carefully and reviewed by a paediatrician. For children closer to 4 years, '
            + 'consider waiting until 48 months and using the SCQ tool instead.',
    canContinue: true,
    questionnaireType: 'mchat_caution',
    questionnaireName: 'M-CHAT-R with age caution (20 questions)',
  },
  scq: {
    color   : '#1a73e8',
    icon    : '📋',
    title   : 'SCQ — Validated Range',
    body    : 'Your child\'s age (48 months / 4 years and above) falls within the clinically '
            + 'validated range for the Social Communication Questionnaire (SCQ).\n\n'
            + 'The SCQ is a 40-question parent-report tool validated for children aged 4 years '
            + 'and above. It is widely used internationally for autism risk screening in older children.',
    canContinue: true,
    questionnaireType: 'scq',
    questionnaireName: 'SCQ (40 questions)',
  },
};

export default function AgeInputScreen({ navigation, route }) {
  const { videoFile } = route.params || {};

  const [years,  setYears]  = useState('');
  const [months, setMonths] = useState('');
  const [bracket, setBracket] = useState(null);

  // calculate bracket whenever parent taps Check Age
  const handleCheckAge = () => {
    const y = parseInt(years,  10) || 0;
    const m = parseInt(months, 10) || 0;

    if (years === '' && months === '') {
      Alert.alert('Enter Age', 'Please enter your child\'s age in years and/or months.');
      return;
    }
    if (m < 0 || m > 11) {
      Alert.alert('Invalid Months', 'Months must be between 0 and 11.');
      return;
    }
    if (y < 0 || y > 18) {
      Alert.alert('Invalid Age', 'Please enter a valid age.');
      return;
    }

    const totalMonths = (y * 12) + m;
    setBracket(getAgeBracket(totalMonths));
  };

  const handleContinue = () => {
    const info = BRACKET_INFO[bracket];
    navigation.navigate('Questionnaire', {
      videoFile,
      questionnaireType: info.questionnaireType,
    });
  };

  const info = bracket ? BRACKET_INFO[bracket] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* title card */}
      <View style={styles.titleCard}>
        <Text style={styles.titleIcon}>🧒</Text>
        <Text style={styles.titleText}>Child's Age</Text>
        <Text style={styles.titleSubtext}>
          We use age to select the clinically appropriate screening questionnaire for your child.
        </Text>
      </View>

      {/* age input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enter Your Child's Age</Text>

        <View style={styles.inputRow}>
          {/* years input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Years</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={years}
              onChangeText={setYears}
            />
          </View>

          <Text style={styles.inputSeparator}>and</Text>

          {/* months input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Months</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              value={months}
              onChangeText={setMonths}
            />
          </View>
        </View>

        <Text style={styles.inputHint}>
          Example: 1 year and 8 months = enter 1 year, 8 months
        </Text>

        <TouchableOpacity style={styles.checkButton} onPress={handleCheckAge}>
          <Text style={styles.checkButtonText}>Check Age →</Text>
        </TouchableOpacity>
      </View>

      {/* result info card — only shown after Check Age is tapped */}
      {info && (
        <View style={[styles.infoCard, { borderLeftColor: info.color }]}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>{info.icon}</Text>
            <Text style={[styles.infoTitle, { color: info.color }]}>{info.title}</Text>
          </View>
          <Text style={styles.infoBody}>{info.body}</Text>

          {info.canContinue && (
            <>
              {/* show which questionnaire will be used */}
              <View style={[styles.toolBadge, { backgroundColor: info.color + '18', borderColor: info.color }]}>
                <Text style={[styles.toolBadgeText, { color: info.color }]}>
                  📋 Questionnaire: {info.questionnaireName}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.continueButton, { backgroundColor: info.color }]}
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText}>Continue to Questionnaire →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* for too_young — show referral button instead */}
          {!info.canContinue && (
            <View style={styles.referralBox}>
              <Text style={styles.referralText}>
                📞 Please contact your paediatrician or developmental specialist directly.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* clinical reference note at bottom */}
      <Text style={styles.clinicalNote}>
        Questionnaire selection is based on validated clinical age ranges.{'\n'}
        M-CHAT-R: Robins et al. (2014) · SCQ: Rutter et al. (2003)
      </Text>

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

  // title card
  titleCard: {
    backgroundColor: '#1a73e8',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },
  titleIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  titleSubtext: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 19,
  },

  // input card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    alignItems: 'center',
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  inputSeparator: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 18,
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 17,
  },
  checkButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  checkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // info card shown after age check
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  infoIcon: {
    fontSize: 26,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  infoBody: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 21,
    marginBottom: 16,
  },
  toolBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  toolBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  continueButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  referralBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
  },
  referralText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },

  // bottom clinical note
  clinicalNote: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 30,
  },
});