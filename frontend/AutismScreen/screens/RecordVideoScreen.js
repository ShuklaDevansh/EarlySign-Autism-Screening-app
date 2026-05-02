import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ScrollView
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function RecordVideoScreen({ navigation }) {
  // stores the selected video file object — null means nothing selected yet
  const [selectedVideo, setSelectedVideo] = useState(null);

  const handleSelectVideo = async () => {
    try {
      // open the phone gallery filtered to video files only
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',       // only show video files
        copyToCacheDirectory: true,  // copy file so we can read it
      });

      // user cancelled the picker — do nothing
      if (result.canceled) {
        return;
      }

      // result.assets is an array — we only need the first file
      const file = result.assets[0];

      // basic size check — warn if video is over 200MB
      if (file.size && file.size > 200 * 1024 * 1024) {
        Alert.alert(
          'Video Too Large',
          'Please select a video under 200MB. Try trimming it first.',
          [{ text: 'OK' }]
        );
        return;
      }

      // store the selected file in state
      setSelectedVideo(file);

    } catch (error) {
      Alert.alert('Error', 'Could not select video. Please try again.');
    }
  };

  const handleNext = () => {
    navigation.navigate('AgeInput', { videoFile: selectedVideo });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Title */}
      <Text style={styles.title}>Step 1: Upload Video</Text>

      {/* Instructions box */}
      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>📋 Recording Instructions</Text>
        <Text style={styles.instructionText}>• Record your child during free play</Text>
        <Text style={styles.instructionText}>• Duration: 3 to 5 minutes</Text>
        <Text style={styles.instructionText}>• Place phone at child's eye level</Text>
        <Text style={styles.instructionText}>• Make sure face is clearly visible</Text>
        <Text style={styles.instructionText}>• Use good lighting — avoid dark rooms</Text>
        <Text style={styles.instructionText}>• Keep video under 200MB</Text>
      </View>

      {/* Select video button */}
      <TouchableOpacity style={styles.selectButton} onPress={handleSelectVideo}>
        <Text style={styles.selectButtonText}>📁 Select Video from Gallery</Text>
      </TouchableOpacity>

      {/* Show selected file name */}
      {selectedVideo && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>✅ Video Selected:</Text>
          <Text style={styles.selectedName} numberOfLines={2}>
            {selectedVideo.name}
          </Text>
          <Text style={styles.selectedSize}>
            Size: {selectedVideo.size
              ? (selectedVideo.size / (1024 * 1024)).toFixed(1) + ' MB'
              : 'Unknown'}
          </Text>
        </View>
      )}

      {/* Next button — disabled until video is selected */}
      <TouchableOpacity
        style={[styles.nextButton, !selectedVideo && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!selectedVideo}
      >
        <Text style={styles.nextButtonText}>Next: Questionnaire →</Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        🔒 Videos are processed securely and not stored permanently.
        This is a screening tool, not a diagnostic tool.
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a56db',
    marginBottom: 24,
  },
  instructionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1a56db',
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a56db',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  selectedSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  nextButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  nextButtonDisabled: {
    // greyed out when no video selected
    backgroundColor: '#93c5fd',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
});