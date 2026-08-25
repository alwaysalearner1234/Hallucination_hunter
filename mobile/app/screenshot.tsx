// app/screenshot.tsx — Screenshot OCR Verification Screen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

export default function ScreenshotScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo access to use this feature.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setExtractedText('');
      setOcrConfidence(null);
      await processOCR(uri);
    }
  };

  const processOCR = async (uri: string) => {
    setIsProcessing(true);
    try {
      const ocr = await api.ocrImage(uri);
      setExtractedText(ocr.text);
      setOcrConfidence(ocr.ocr_confidence);
      setLowConfidenceWarning(ocr.low_confidence);
    } catch (err: unknown) {
      Alert.alert(
        'OCR Failed',
        err instanceof Error ? err.message : 'Could not extract text from image.',
        [{ text: 'OK' }]
      );
      setImageUri(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = () => {
    if (!extractedText.trim()) {
      Alert.alert('No Text', 'Please select an image with text first.');
      return;
    }
    router.push({
      pathname: '/verify/analysis',
      params: { text: extractedText.trim(), mode: 'standard', source_type: 'screenshot' },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Screenshot</Text>
          <Text style={styles.subtitle}>Select a screenshot of an AI response to verify</Text>
        </View>

        {/* Image picker buttons */}
        {!imageUri && (
          <View style={styles.pickerButtons}>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(true)}>
              <Text style={styles.pickerIcon}>📷</Text>
              <Text style={styles.pickerLabel}>Take Photo</Text>
              <Text style={styles.pickerDesc}>Capture now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(false)}>
              <Text style={styles.pickerIcon}>🖼️</Text>
              <Text style={styles.pickerLabel}>Choose Image</Text>
              <Text style={styles.pickerDesc}>From gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected image preview */}
        {imageUri && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            <TouchableOpacity style={styles.changeImageBtn} onPress={() => pickImage(false)}>
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OCR Processing indicator */}
        {isProcessing && (
          <View style={styles.processingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.processingText}>Extracting text from image...</Text>
          </View>
        )}

        {/* OCR Result */}
        {extractedText && !isProcessing && (
          <>
            {/* Confidence indicator */}
            <View style={styles.ocrStats}>
              <View style={styles.ocrStat}>
                <Text style={[
                  styles.ocrConfidenceValue,
                  { color: (ocrConfidence ?? 0) >= 0.7 ? Colors.verified : Colors.unverifiable }
                ]}>
                  {Math.round((ocrConfidence ?? 0) * 100)}%
                </Text>
                <Text style={styles.ocrStatLabel}>OCR Confidence</Text>
              </View>
              <View style={styles.ocrStat}>
                <Text style={styles.ocrCharValue}>{extractedText.length.toLocaleString()}</Text>
                <Text style={styles.ocrStatLabel}>Characters</Text>
              </View>
            </View>

            {/* Low confidence warning */}
            {lowConfidenceWarning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ OCR confidence is low. Please review the extracted text and correct any errors before verifying.
                </Text>
              </View>
            )}

            {/* Editable text */}
            <Text style={styles.extractedLabel}>Extracted Text (editable)</Text>
            <View style={styles.textEditContainer}>
              <TextInput
                style={styles.textEdit}
                value={extractedText}
                onChangeText={setExtractedText}
                multiline
                textAlignVertical="top"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Verify button */}
            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
              <Text style={styles.verifyBtnText}>🔍 Verify Extracted Text</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.xl },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontFamily: 'Inter_700Bold', marginBottom: Spacing.xs },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular' },
  pickerButtons: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  pickerIcon: { fontSize: 40 },
  pickerLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_600SemiBold' },
  pickerDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_400Regular' },
  imagePreview: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  previewImage: { width: '100%', height: 200 },
  changeImageBtn: { padding: Spacing.md, alignItems: 'center' },
  changeImageText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  processingBox: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.base },
  processingText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular' },
  ocrStats: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  ocrStat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  ocrConfidenceValue: { fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold' },
  ocrCharValue: { fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold', color: Colors.accent },
  ocrStatLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  warningBox: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
    backgroundColor: `${Colors.unverifiable}12`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.unverifiable}30`,
  },
  warningText: { color: Colors.unverifiable, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  extractedLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  textEditContainer: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  textEdit: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_400Regular',
    padding: Spacing.base,
    minHeight: 150,
    lineHeight: 20,
  },
  verifyBtn: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    ...Shadows.md,
  },
  verifyBtnText: { color: Colors.white, fontSize: Typography.fontSize.md, fontFamily: 'Inter_700Bold' },
});
