import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert
} from 'react-native';

// all 20 M-CHAT-R questions
// riskAnswer: true = "Yes" is risk-indicating, false = "No" is risk-indicating
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

// all 40 SCQ questions (Social Communication Questionnaire)
// validated for children 4 years (48 months) and above — Rutter et al. (2003)
// riskAnswer: true = "Yes" is risk-indicating, false = "No" is risk-indicating
const SCQ_QUESTIONS = [
  { id: 1,  text: "Is s/he now able to talk using short phrases or sentences?",                                                              riskAnswer: false },
  { id: 2,  text: "Can you have a to-and-fro conversation with him/her that involves taking turns or building on what you have said?",       riskAnswer: false },
  { id: 3,  text: "Has s/he ever used odd phrases or said the same thing over and over in almost exactly the same way?",                     riskAnswer: true  },
  { id: 4,  text: "Has s/he ever used people's hands or bodies as tools as if they were part of his/her own body?",                         riskAnswer: true  },
  { id: 5,  text: "Has s/he ever had difficulty in making up stories or games where s/he pretends something?",                               riskAnswer: true  },
  { id: 6,  text: "Does s/he ever talk to you just to be friendly?",                                                                         riskAnswer: false },
  { id: 7,  text: "Does s/he ever copy or imitate what other people are doing just because they find it interesting?",                       riskAnswer: false },
  { id: 8,  text: "Does s/he ever produce sounds or talk in a way that is unusual or sounds different from other children?",                 riskAnswer: true  },
  { id: 9,  text: "Does s/he ever use another person's face to check your reaction when s/he is unsure what to do?",                        riskAnswer: false },
  { id: 10, text: "Does s/he show a normal range of facial expressions?",                                                                     riskAnswer: false },
  { id: 11, text: "Does s/he ever do things over and over in the same way or insist on things being the same?",                             riskAnswer: true  },
  { id: 12, text: "Does s/he have any particular friends or a best friend?",                                                                  riskAnswer: false },
  { id: 13, text: "Does s/he ever talk to you about his/her interests or enthusiasms?",                                                       riskAnswer: false },
  { id: 14, text: "Does s/he ever seem to be more interested in parts of a toy or an object rather than using the object as intended?",      riskAnswer: true  },
  { id: 15, text: "Does s/he ever seem to want to share his/her enjoyment of things with you by pointing at things?",                        riskAnswer: false },
  { id: 16, text: "Does s/he ever join in play with other children easily?",                                                                  riskAnswer: false },
  { id: 17, text: "Does s/he ever come to you spontaneously for a chat?",                                                                    riskAnswer: false },
  { id: 18, text: "Would you describe his/her language as unusual in any way?",                                                               riskAnswer: true  },
  { id: 19, text: "Does s/he ever engage in imaginative play with another child in a way that you can tell s/he understands what the other is pretending?", riskAnswer: false },
  { id: 20, text: "Does s/he ever appear to be more interested in the sensory qualities of objects?",                                        riskAnswer: true  },
  { id: 21, text: "Does s/he ever spontaneously point at things around him/her just to show you things?",                                    riskAnswer: false },
  { id: 22, text: "Does s/he ever use gestures, other than pointing, to let you know what s/he wants?",                                     riskAnswer: false },
  { id: 23, text: "Does s/he tend to have conversations with people just because s/he enjoys talking to them?",                             riskAnswer: false },
  { id: 24, text: "Does s/he ever make simple movements with his/her whole body over and over again?",                                       riskAnswer: true  },
  { id: 25, text: "Does s/he have difficulty making friends with other children?",                                                           riskAnswer: true  },
  { id: 26, text: "Does s/he tend to take things very literally and misunderstand what you say?",                                            riskAnswer: true  },
  { id: 27, text: "Does s/he ever watch other children to see what they are doing and then join in?",                                        riskAnswer: false },
  { id: 28, text: "Does s/he ever try to attract your attention by calling out to you or coming to get you?",                                riskAnswer: false },
  { id: 29, text: "Does s/he have any special interests which others might find unusual?",                                                    riskAnswer: true  },
  { id: 30, text: "Does s/he show a wide range of emotions?",                                                                                 riskAnswer: false },
  { id: 31, text: "Does s/he tend to talk a lot about one subject that s/he is particularly interested in?",                                riskAnswer: true  },
  { id: 32, text: "Does s/he ever spontaneously look at your face to check your reaction?",                                                  riskAnswer: false },
  { id: 33, text: "Does s/he seem able to understand the feelings of others?",                                                               riskAnswer: false },
  { id: 34, text: "Does s/he ever use odd ways to greet people?",                                                                            riskAnswer: true  },
  { id: 35, text: "Does s/he play with other children in a cooperative and imaginative way?",                                                riskAnswer: false },
  { id: 36, text: "Does s/he avoid eye contact with other people?",                                                                          riskAnswer: true  },
  { id: 37, text: "Does s/he ever walk on his/her toes?",                                                                                    riskAnswer: true  },
  { id: 38, text: "Does s/he spend time doing the same thing over and over, seemingly for its own sake?",                                    riskAnswer: true  },
  { id: 39, text: "Does s/he have difficulty understanding the feelings of others?",                                                         riskAnswer: true  },
  { id: 40, text: "Does s/he ever use hand or finger mannerisms (like flapping or twisting)?",                                              riskAnswer: true  },
];

// config for each questionnaire type
const QUESTIONNAIRE_CONFIG = {
  mchat: {
    questions   : MCHAT_QUESTIONS,
    totalScore  : 20,
    title       : 'M-CHAT-R Questionnaire',
    subtitle    : 'Developmental Screening — 20 Questions',
    caveatBanner: null,
  },
  mchat_caution: {
    questions   : MCHAT_QUESTIONS,
    totalScore  : 20,
    title       : 'M-CHAT-R Questionnaire',
    subtitle    : 'Developmental Screening — 20 Questions',
    caveatBanner: '⚠️ Age Note: M-CHAT-R is formally validated for 16–30 months. Your child is slightly outside this range. Results should be interpreted with extra caution and reviewed by a paediatrician.',
  },
  scq: {
    questions   : SCQ_QUESTIONS,
    totalScore  : 40,
    title       : 'SCQ Questionnaire',
    subtitle    : 'Social Communication Questionnaire — 40 Questions',
    caveatBanner: null,
  },
};

export default function QuestionnaireScreen({ navigation, route }) {
  // receive video file and questionnaire type from AgeInputScreen
  const { videoFile, questionnaireType = 'mchat' } = route.params || {};

  const config    = QUESTIONNAIRE_CONFIG[questionnaireType] || QUESTIONNAIRE_CONFIG.mchat;
  const questions = config.questions;

  // answers object — key is question id, value is true (Yes) or false (No)
  const [answers, setAnswers] = useState({});

  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === questions.length;

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    // count how many answers match the risk-indicating answer for that question
    let score = 0;
    for (const question of questions) {
      if (answers[question.id] === question.riskAnswer) {
        score += 1;
      }
    }
    return score;
  };

  const handleSubmit = () => {
    if (!allAnswered) {
      Alert.alert(
        'Incomplete',
        `Please answer all ${questions.length} questions. You have answered ${answeredCount} so far.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const rawScore = calculateScore();

    // normalize to 0–20 scale regardless of questionnaire length
    // this ensures backend scoring model always receives a comparable number
    // M-CHAT-R: raw out of 20 → stays as is
    // SCQ: raw out of 40 → divide by 2 to get equivalent 0–20 score
    const normalizedScore = Math.round((rawScore / config.totalScore) * 20);

    navigation.navigate('Results', {
      videoFile,
      questionnaireScore: normalizedScore,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* compact header card combining title + progress */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          </View>
          {/* progress percentage circle on the right */}
          <View style={styles.progressCircle}>
            <Text style={styles.progressCircleText}>
              {Math.round((answeredCount / questions.length) * 100)}%
            </Text>
          </View>
        </View>

        {/* progress bar */}
        <View style={styles.progressBarBackground}>
          <View style={[
            styles.progressBarFill,
            { width: `${(answeredCount / questions.length) * 100}%` }
          ]} />
        </View>
        <Text style={styles.progressText}>
          {answeredCount} of {questions.length} questions answered
        </Text>
      </View>

      {/* age caution banner — only shown for mchat_caution type */}
      {config.caveatBanner && (
        <View style={styles.caveatBanner}>
          <Text style={styles.caveatBannerText}>{config.caveatBanner}</Text>
        </View>
      )}

      {/* render all questions */}
      {questions.map((question) => {
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
          {allAnswered ? 'Submit & View Results →' : `Answer all ${questions.length} questions to continue`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        {questionnaireType === 'scq'
          ? 'SCQ is a validated screening tool (Rutter et al., 2003). Results are not a diagnosis.'
          : 'M-CHAT-R is a validated screening tool (Robins et al., 2014). Results are not a diagnosis.'
        }{'\n'}Always consult a paediatrician for professional evaluation.
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
    marginBottom: 16,
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
  headerTextGroup: {
    flex: 1,
    paddingRight: 10,
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

  // caution banner for mchat_caution type
  caveatBanner: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  caveatBannerText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
  },

  // question cards
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

  // submit button
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