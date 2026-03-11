import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';

// all 20 M-CHAT-R questions with their risk-indicating answer
// riskAnswer: true = "Yes" is risk, false = "No" is risk
const MCHAT_QUESTIONS = [
  { id: 1,  text: "If you point at something across the room, does your child look at it?",                          riskAnswer: false },
  { id: 2,  text: "Have you ever wondered if your child might be deaf?",                                             riskAnswer: true  },
  { id: 3,  text: "Does your child play pretend or make-believe?",                                                   riskAnswer: false },
  { id: 4,  text: "Does your child like climbing on things?",                                                        riskAnswer: false },
  { id: 5,  text: "Does your child make unusual finger movements near his/her eyes?",                                riskAnswer: true  },
  { id: 6,  text: "Does your child point with one finger to ask for something or to get help?",                      riskAnswer: false },
  { id: 7,  text: "Does your child point with one finger to show you something interesting?",                        riskAnswer: false },
  { id: 8,  text: "Is your child interested in other children?",                                                     riskAnswer: false },
  { id: 9,  text: "Does your child show you things by bringing them to you or holding them up for you to see?",      riskAnswer: false },
  { id: 10, text: "Does your child respond to his/her name when you call?",                                          riskAnswer: false },
  { id: 11, text: "When you smile at your child, does s/he smile back?",                                             riskAnswer: false },
  { id: 12, text: "Does your child get upset by everyday noises?",                                                   riskAnswer: true  },
  { id: 13, text: "Does your child walk?",                                                                           riskAnswer: false },
  { id: 14, text: "Does your child look you in the eye when talking, playing, or dressing?",                         riskAnswer: false },
  { id: 15, text: "Does your child try to copy what you do?",                                                        riskAnswer: false },
  { id: 16, text: "If you turn your head to look at something, does your child look around to see what you are looking at?", riskAnswer: false },
  { id: 17, text: "Does your child try to get you to watch him/her?",                                                riskAnswer: false },
  { id: 18, text: "Does your child understand when you tell him/her to do something?",                               riskAnswer: false },
  { id: 19, text: "If something new happens, does your child look at your face to see how you feel about it?",       riskAnswer: false },
  { id: 20, text: "Does your child like movement activities?",                                                       riskAnswer: false },
];

export default function QuestionnaireScreen({ navigation, route }) {
  // receive the video file passed from RecordVideoScreen
  const { videoFile } = route.params || {};

  // answers object — key is question id, value is true (Yes) or false (No)
  const [answers, setAnswers] = useState({});

  // count how many questions have been answered so far
  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === MCHAT_QUESTIONS.length;

  const handleAnswer = (questionId, answer) => {
    // store the answer — true = Yes, false = No
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    // count how many answers match the risk-indicating answer for that question
    let score = 0;
    for (const question of MCHAT_QUESTIONS) {
      const answer = answers[question.id];
      if (answer === question.riskAnswer) {
        score += 1;
      }
    }
    return score;
  };

  const handleSubmit = () => {
    if (!allAnswered) {
      Alert.alert(
        'Incomplete',
        `Please answer all 20 questions. You have answered ${answeredCount} so far.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const score = calculateScore();

    // pass both video and questionnaire score to ResultsScreen
    navigation.navigate('Results', {
      videoFile        : videoFile,
      questionnaireScore: score,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* compact header card combining title + progress */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>M-CHAT-R Questionnaire</Text>
            <Text style={styles.subtitle}>Developmental Screening — 20 Questions</Text>
          </View>
          {/* progress percentage circle on the right */}
          <View style={styles.progressCircle}>
            <Text style={styles.progressCircleText}>
              {Math.round((answeredCount / MCHAT_QUESTIONS.length) * 100)}%
            </Text>
          </View>
        </View>

        {/* progress bar with count below */}
        <View style={styles.progressBarBackground}>
          <View style={[
            styles.progressBarFill,
            { width: `${(answeredCount / MCHAT_QUESTIONS.length) * 100}%` }
          ]} />
        </View>
        <Text style={styles.progressText}>
          {answeredCount} of {MCHAT_QUESTIONS.length} questions answered
        </Text>
      </View>

      {/* Render all 20 questions */}
      {MCHAT_QUESTIONS.map((question) => {
        const answered    = answers[question.id] !== undefined;
        const yesSelected = answers[question.id] === true;
        const noSelected  = answers[question.id] === false;

        return (
          <View key={question.id} style={[
            styles.questionCard,
            answered && styles.questionCardAnswered
          ]}>
            <Text style={styles.questionNumber}>Q{question.id}</Text>
            <Text style={styles.questionText}>{question.text}</Text>

            <View style={styles.buttonRow}>
              {/* Yes button */}
              <TouchableOpacity
                style={[styles.answerButton, yesSelected && styles.answerButtonSelected]}
                onPress={() => handleAnswer(question.id, true)}
              >
                <Text style={[
                  styles.answerButtonText,
                  yesSelected && styles.answerButtonTextSelected
                ]}>Yes</Text>
              </TouchableOpacity>

              {/* No button */}
              <TouchableOpacity
                style={[styles.answerButton, noSelected && styles.answerButtonSelected]}
                onPress={() => handleAnswer(question.id, false)}
              >
                <Text style={[
                  styles.answerButtonText,
                  noSelected && styles.answerButtonTextSelected
                ]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitButton, !allAnswered && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!allAnswered}
      >
        <Text style={styles.submitButtonText}>
          {allAnswered ? 'Submit & View Results →' : `Answer all questions to continue`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        M-CHAT-R is a validated screening tool. Results are not a diagnosis.
        Always consult a pediatrician for professional evaluation.
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
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#1a73e8',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
  },
  questionCardAnswered: {
    // green left border when answered
    borderLeftColor: '#10b981',
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a56db',
    marginBottom: 6,
  },
  questionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  answerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1a56db',
    alignItems: 'center',
  },
  answerButtonSelected: {
    backgroundColor: '#1a56db',
  },
  answerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a56db',
  },
  answerButtonTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 30,
  },
});