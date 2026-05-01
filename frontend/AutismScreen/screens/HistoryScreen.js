import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function HistoryScreen({ navigation }) {
  // holds the list of past screenings fetched from Firestore
  const [screenings, setScreenings] = useState([]);
  // true while we are waiting for Firestore to respond
  const [loading, setLoading] = useState(true);
  // holds any error message if Firestore fetch fails
  const [error, setError] = useState(null);

  // runs once when screen loads
  useEffect(() => {
    fetchScreenings();
  }, []);

  const fetchScreenings = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, "users", userId, "sessions"),
        orderBy("timestamp", "desc")
      );

      // actually fetch the documents from Firestore
      const querySnapshot = await getDocs(q);

      // convert each Firestore document into a plain JS object
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,       // Firestore auto-generated document ID
        ...doc.data(),    // spread all saved fields into this object
      }));

      setScreenings(results);
    } catch (err) {
      // something went wrong — store the message to show the user
      setError("Could not load history. Please check your connection.");
      console.error("Firestore fetch error:", err);
    } finally {
      // whether success or fail, stop showing the spinner
      setLoading(false);
    }
  };

  // returns the right color for each risk level
  const getRiskColor = (level) => {
    if (level === "LOW") return "#2ecc71";
    if (level === "MEDIUM") return "#f39c12";
    if (level === "HIGH") return "#e74c3c";
    return "#95a5a6"; // fallback grey
  };

  // converts a Firestore timestamp object to a readable date string
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    // Firestore timestamps have a .toDate() method
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // renders one screening card
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* top row: date on left, risk badge on right */}
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
        <View
          style={[
            styles.riskBadge,
            { backgroundColor: getRiskColor(item.risk_level) },
          ]}
        >
          <Text style={styles.riskBadgeText}>{item.risk_level ?? "—"}</Text>
        </View>
      </View>

      {/* divider line */}
      <View style={styles.divider} />

      {/* score row */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Final Score</Text>
          <Text style={styles.scoreValue}>
            {item.final_score != null
              ? (item.final_score * 100).toFixed(0) + "%"
              : "—"}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Video Score</Text>
          <Text style={styles.scoreValue}>
            {item.video_risk_score != null
              ? (item.video_risk_score * 100).toFixed(0) + "%"
              : "—"}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Questionnaire</Text>
          <Text style={styles.scoreValue}>
            {item.questionnaire_score != null ? item.questionnaire_score + "/20" : "—"}
          </Text>
        </View>
      </View>

      {/* top contributing feature */}
      {item.top_contributing_feature ? (
        <Text style={styles.featureText}>
          Key signal:{" "}
          <Text style={styles.featureBold}>
            {item.top_contributing_feature.replace(/_/g, " ")}
          </Text>
        </Text>
      ) : null}
    </View>
  );

  // --- RENDER LOGIC ---

  // show spinner while loading
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading past screenings...</Text>
      </View>
    );
  }

  // show error state with retry button
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchScreenings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // show empty state if no screenings exist yet
  if (screenings.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No screenings yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete your first screening to see results here.
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.startButtonText}>Start a Screening</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // main list view
  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Screening History</Text>
        <Text style={styles.headerSubtitle}>
          {screenings.length} session{screenings.length !== 1 ? "s" : ""} recorded
        </Text>
      </View>

      {/* list of screening cards */}
      <FlatList
        data={screenings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4ff",  // light blue-tinted background
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4ff",
    padding: 24,
  },
  header: {
    backgroundColor: "#1a73e8",  // primary blue
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#c7d9fb",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    // shadow for Android
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 12,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scoreBox: {
    alignItems: "center",
    flex: 1,
  },
  scoreLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
    textAlign: "center",
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a73e8",
  },
  featureText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  featureBold: {
    fontWeight: "600",
    color: "#1a1a2e",
    textTransform: "capitalize",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});