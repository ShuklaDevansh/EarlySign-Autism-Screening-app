import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar backgroundColor="#1a73e8" barStyle="light-content" />

      {/* ── HERO SECTION ── */}
      <View style={styles.hero}>
        {/* logo from assets folder */}
        <View style={styles.logoCircle}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroSubtext}>
          AI-powered early autism risk screening{"\n"}for children aged 6 months – 5 years
        </Text>
      </View>

      {/* ── HOW IT WORKS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>

        {/* step 1 */}
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload a Video</Text>
            <Text style={styles.stepDesc}>
              Record your child during free play and upload the video
            </Text>
          </View>
        </View>

        {/* step 2 */}
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Answer Questions</Text>
            <Text style={styles.stepDesc}>
              Complete the 20-question M-CHAT-R developmental checklist
            </Text>
          </View>
        </View>

        {/* step 3 */}
        <View style={styles.stepCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Get Your Results</Text>
            <Text style={styles.stepDesc}>
              Receive an AI-analysed risk score with personalised suggestions
            </Text>
          </View>
        </View>
      </View>

      {/* ── BUTTONS ── */}
      <View style={styles.buttonSection}>
        {/* primary action */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("RecordVideo")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>▶  Start Screening</Text>
        </TouchableOpacity>

        {/* secondary action — same blue family, outlined */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("History")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>📋  View History</Text>
        </TouchableOpacity>
      </View>

      {/* ── DISCLAIMER ── */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          🔒 This is a screening tool, not a diagnostic tool. Results should
          always be reviewed by a qualified healthcare professional.
        </Text>
      </View>

      {/* bottom padding so content doesn't touch edge */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4ff",  // light blue-tinted background used across all screens
  },

  // hero
  hero: {
    backgroundColor: "#b7d2ff",  // primary blue
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,            // perfect circle
    backgroundColor: "#ffffff",  // white fill
    borderWidth: 3,
    borderColor: "#1a73e8",      // blue border
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    // shadow to lift it off the background
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 130,
    height: 130,                 // slightly smaller than circle so padding shows
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#c7d9fb",
    marginTop: 4,
    fontStyle: "italic",
  },
  heroSubtext: {
    fontSize: 13,
    color: "#1a1a2e",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },

  // how it works section
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    // Android shadow
    elevation: 2,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a73e8",  // blue circle with number
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },

  // buttons
  buttonSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,                      // space between buttons
  },
  primaryButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    // shadow on button
    shadowColor: "#1a73e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",   // white background
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1a73e8",       // blue border to stay in theme
    elevation: 1,
  },
  secondaryButtonText: {
    color: "#1a73e8",             // blue text
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // disclaimer
  disclaimer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#e8f0fe",  // very light blue background
    borderRadius: 10,
    padding: 14,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
  },
});