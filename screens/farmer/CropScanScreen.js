import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert, ActivityIndicator, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CropScanScreen() {
  const { user, getVillage } = useAuth();
  const { t, language } = useLanguage();

  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState('public');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async (useCamera) => {
    try {
      setError('');
      setResult(null);
      setShared(false);

      let response;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          return Alert.alert(
            t('error'),
            'Camera permission is required to scan crops.'
          );
        }
        response = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3]
        });
      } else {
        response = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3]
        });
      }

      if (!response.canceled && response.assets?.[0]) {
        setImage(response.assets[0].uri);
      }
    } catch (err) {
      Alert.alert(t('error'), 'Could not open camera/gallery. Try again.');
    }
  };

  const scanCrop = async () => {
    if (!image) {
      return Alert.alert(t('error'), t('select_image_first') || 'Please select an image first');
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'crop_scan.jpg'
      });
      formData.append('village', getVillage());
      formData.append('language', language || 'en');

      const response = await api.post('/crop/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000 // 90 seconds — API calls take time
      });

      if (response.data.success) {
        setResult(response.data.data);
        setShared(false);
      } else {
        setError(response.data.message || t('scan_failed') || 'Scan failed. Try again.');
      }
    } catch (err) {
      console.log('Scan error:', err.message);
      if (err.response?.status === 400) {
        // Not a crop image or bad request
        setError(err.response.data.message || 'Please upload a clear crop image.');
        if (err.response.data.notCrop) {
          setImage(null); // Clear the image so user uploads again
        }
      } else if (err.code === 'ECONNABORTED') {
        setError('Analysis is taking too long. Please try again with a clearer photo.');
      } else {
        setError(err.response?.data?.message || 'Scan failed. Check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    setSharing(true);
    try {
      if (result.reportId) {
        await api.post(`/crop/report/${result.reportId}/share`);
      }

      const isHealthy = result.isHealthy;
      const content = isHealthy
        ? `✅ My ${result.cropIdentified} crop is healthy! ${result.farmerMessage || ''}`
        : `🌾 Crop Alert: My ${result.cropIdentified} has ${result.diseaseName}. Severity: ${result.severity}.\n🌿 Organic: ${result.treatment?.organic || 'N/A'}\n🧪 Chemical: ${result.treatment?.chemical || 'N/A'}\n🛡️ Prevention: ${result.treatment?.prevention || 'N/A'}`;

      await api.post('/community/post', {
        content,
        village: getVillage(),
        category: 'crop',
        visibility: shareVisibility
      });

      setShared(true);
      setShareModal(false);
      Alert.alert(
        '✅ Shared!',
        shareVisibility === 'public'
          ? 'Report shared to all farmers in your village!'
          : 'Report shared to Field Officer only!'
      );
    } catch (err) {
      Alert.alert(t('error'), 'Could not share. Try again.');
    } finally {
      setSharing(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity === 'Severe') return '#c62828';
    if (severity === 'Moderate') return '#f57f17';
    if (severity === 'Mild') return '#f9a825';
    if (severity === 'Healthy') return '#2e7d32';
    return '#2e7d32';
  };

  const getSeverityEmoji = (severity) => {
    if (severity === 'Severe') return '🔴';
    if (severity === 'Moderate') return '🟡';
    if (severity === 'Mild') return '🟠';
    if (severity === 'Healthy') return '🟢';
    return '🟢';
  };

  const resetScan = () => {
    setImage(null);
    setResult(null);
    setError('');
    setShared(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📷 {t('scan_crop')}</Text>
        <Text style={styles.headerSub}>
          {t('ai_powered') || 'AI powered disease detection'}
        </Text>
      </View>

      {/* Instructions */}
      {!image && !result && (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>
            📋 {t('how_to_scan') || 'How to scan'}
          </Text>
          <Text style={styles.instructionItem}>
            1️⃣ {t('take_clear_photo') || 'Take a clear photo of your crop leaves or plant'}
          </Text>
          <Text style={styles.instructionItem}>
            2️⃣ {t('ensure_good_light') || 'Make sure there is good lighting'}
          </Text>
          <Text style={styles.instructionItem}>
            3️⃣ {t('get_instant_results') || 'Get instant disease detection and treatment advice'}
          </Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 {t('scan_tip') || 'Tip: Focus on affected leaves for best results. You can scan any crop — rice, wheat, tomato, cotton, and more!'}
            </Text>
          </View>
        </View>
      )}

      {/* Image Picker Buttons */}
      {!result && (
        <View style={styles.pickRow}>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#e8f5e9' }]}
            onPress={() => pickImage(true)}
          >
            <Text style={styles.pickEmoji}>📸</Text>
            <Text style={styles.pickLabel}>{t('camera') || 'Camera'}</Text>
            <Text style={styles.pickSub}>{t('take_photo') || 'Take Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#e3f2fd' }]}
            onPress={() => pickImage(false)}
          >
            <Text style={styles.pickEmoji}>🖼️</Text>
            <Text style={styles.pickLabel}>{t('gallery') || 'Gallery'}</Text>
            <Text style={styles.pickSub}>{t('choose_photo') || 'Choose Photo'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Message */}
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={resetScan}>
            <Text style={styles.retryBtnText}>🔄 {t('try_again') || 'Try Again'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Selected Image */}
      {image && !result && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />

          {loading ? (
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color="#2e7d32" />
              <Text style={styles.analyzingText}>
                {t('ai_analyzing') || 'AI Analyzing your crop...'}
              </Text>
              <Text style={styles.analyzingSubText}>
                {t('analysis_wait') || 'This may take 15-30 seconds'}
              </Text>
            </View>
          ) : (
            <View style={styles.imageActions}>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={scanCrop}
              >
                <Text style={styles.scanBtnText}>
                  🔍 {t('analyze_crop')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={resetScan}
              >
                <Text style={styles.changeBtnText}>
                  🔄 {t('change_photo') || 'Change Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Result Card */}
      {result && (
        <View style={styles.resultContainer}>
          {/* Crop Image */}
          {image && (
            <Image source={{ uri: image }} style={styles.resultImage} />
          )}

          {/* Status Banner */}
          <View style={[styles.statusBanner,
            { backgroundColor: getSeverityColor(result.severity) }]}>
            <Text style={styles.statusEmoji}>
              {getSeverityEmoji(result.severity)}
            </Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusCrop}>{result.cropIdentified}</Text>
              <Text style={styles.statusDisease}>{result.diseaseName}</Text>
            </View>
            <View style={styles.severityBadge}>
              <Text style={styles.severityText}>{result.severity}</Text>
            </View>
          </View>

          {/* Farmer Message */}
          {result.farmerMessage ? (
            <View style={[styles.messageCard,
              result.isHealthy ? styles.healthyMessageCard : styles.diseaseMessageCard]}>
              <Text style={styles.messageText}>💬 {result.farmerMessage}</Text>
            </View>
          ) : null}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{result.confidence}%</Text>
              <Text style={styles.statLabel}>{t('confidence')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {getSeverityEmoji(result.severity)} {result.severity}
              </Text>
              <Text style={styles.statLabel}>{t('severity')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {result.isHealthy ? '✅' : '⚠️'}
              </Text>
              <Text style={styles.statLabel}>
                {result.isHealthy ? (t('healthy') || 'Healthy') : (t('disease') || 'Disease')}
              </Text>
            </View>
          </View>

          {/* Treatment Box */}
          {!result.isHealthy && (
            <View style={styles.treatmentCard}>
              <Text style={styles.treatmentTitle}>
                💊 {t('ai_treatment')}
              </Text>

              {result.treatment?.organic ? (
                <View style={styles.treatmentItem}>
                  <Text style={styles.treatmentLabel}>🌿 {t('organic')}</Text>
                  <Text style={styles.treatmentText}>{result.treatment.organic}</Text>
                </View>
              ) : null}

              {result.treatment?.chemical ? (
                <View style={[styles.treatmentItem, styles.chemicalItem]}>
                  <Text style={styles.treatmentLabel}>🧪 {t('chemical')}</Text>
                  <Text style={styles.treatmentText}>{result.treatment.chemical}</Text>
                </View>
              ) : null}

              {result.treatment?.prevention ? (
                <View style={[styles.treatmentItem, styles.preventionItem]}>
                  <Text style={styles.treatmentLabel}>🛡️ {t('prevention')}</Text>
                  <Text style={styles.treatmentText}>{result.treatment.prevention}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Healthy Tips */}
          {result.isHealthy && result.treatment?.prevention && (
            <View style={styles.healthyCard}>
              <Text style={styles.healthyTitle}>
                🌱 {t('preventive_care') || 'Preventive Care Tips'}
              </Text>
              <Text style={styles.healthyText}>{result.treatment.prevention}</Text>
            </View>
          )}

          {/* Consult Officer Warning */}
          {result.consultOfficer && (
            <View style={styles.consultCard}>
              <Text style={styles.consultTitle}>
                👨‍🌾 {t('consult_officer') || 'Consult Agricultural Officer'}
              </Text>
              <Text style={styles.consultText}>
                {result.consultReason || t('consult_reason_default') || 'This disease may require professional guidance. Contact your local Krishi Vigyan Kendra (KVK) or agricultural officer.'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!shared ? (
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => setShareModal(true)}
              >
                <Text style={styles.shareBtnText}>
                  📢 {t('share_community')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sharedBadge}>
                <Text style={styles.sharedBadgeText}>
                  ✅ {t('shared_community')}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.scanAgainBtn}
              onPress={resetScan}
            >
              <Text style={styles.scanAgainBtnText}>
                🔄 {t('scan_again') || 'Scan Another Crop'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Share Modal */}
      <Modal visible={shareModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📢 {t('share_community')}</Text>
            <Text style={styles.modalSubTitle}>{t('who_can_see')}?</Text>

            <TouchableOpacity
              style={[styles.visibilityOption,
                shareVisibility === 'public' && styles.selectedVisibility]}
              onPress={() => setShareVisibility('public')}
            >
              <Text style={styles.visibilityEmoji}>🌍</Text>
              <View style={styles.visibilityInfo}>
                <Text style={styles.visibilityTitle}>{t('public')}</Text>
                <Text style={styles.visibilityDesc}>{t('everyone_village')}</Text>
              </View>
              {shareVisibility === 'public' && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.visibilityOption,
                shareVisibility === 'gramsevak_only' && styles.selectedVisibilityOrange]}
              onPress={() => setShareVisibility('gramsevak_only')}
            >
              <Text style={styles.visibilityEmoji}>🔒</Text>
              <View style={styles.visibilityInfo}>
                <Text style={styles.visibilityTitle}>
                  {t('field_officer_only') || 'Field Officer Only'}
                </Text>
                <Text style={styles.visibilityDesc}>{t('only_gramsevak')}</Text>
              </View>
              {shareVisibility === 'gramsevak_only' && (
                <Text style={[styles.checkmark, { color: '#e65100' }]}>✓</Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShareModal(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, sharing && { backgroundColor: '#aaa' }]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.confirmBtnText}>{t('share')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },

  header: {
    backgroundColor: '#2e7d32', padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#c8e6c9', marginTop: 4 },

  instructionsCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 16, elevation: 2
  },
  instructionsTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#2e7d32', marginBottom: 12
  },
  instructionItem: {
    fontSize: 14, color: '#444',
    marginBottom: 8, lineHeight: 20
  },
  tipBox: {
    backgroundColor: '#f1f8e9', borderRadius: 10,
    padding: 12, marginTop: 8
  },
  tipText: { fontSize: 13, color: '#2e7d32', lineHeight: 18 },

  pickRow: { flexDirection: 'row', margin: 16, gap: 12 },
  pickBtn: {
    flex: 1, borderRadius: 16, padding: 20,
    alignItems: 'center', elevation: 2
  },
  pickEmoji: { fontSize: 40, marginBottom: 8 },
  pickLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  pickSub: { fontSize: 12, color: '#666', marginTop: 4 },

  errorCard: {
    margin: 16, backgroundColor: '#ffebee',
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#c62828',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 15, color: '#c62828',
    textAlign: 'center', lineHeight: 22
  },
  retryBtn: {
    marginTop: 12, backgroundColor: '#2e7d32',
    borderRadius: 10, padding: 12, paddingHorizontal: 24
  },
  retryBtnText: { color: 'white', fontWeight: 'bold' },

  imageContainer: { margin: 16 },
  previewImage: {
    width: '100%', height: 260,
    borderRadius: 16, marginBottom: 12
  },
  analyzingCard: {
    backgroundColor: 'white', borderRadius: 14,
    padding: 24, alignItems: 'center', elevation: 2
  },
  analyzingText: {
    fontSize: 16, fontWeight: 'bold',
    color: '#2e7d32', marginTop: 12
  },
  analyzingSubText: { fontSize: 13, color: '#888', marginTop: 6 },

  imageActions: { gap: 10 },
  scanBtn: {
    backgroundColor: '#2e7d32', borderRadius: 12,
    padding: 18, alignItems: 'center'
  },
  scanBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  changeBtn: {
    backgroundColor: 'white', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  changeBtnText: { color: '#666', fontSize: 15, fontWeight: '600' },

  resultContainer: { margin: 16 },
  resultImage: {
    width: '100%', height: 200,
    borderRadius: 16, marginBottom: 12
  },

  statusBanner: {
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, gap: 12
  },
  statusEmoji: { fontSize: 36 },
  statusInfo: { flex: 1 },
  statusCrop: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  statusDisease: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  severityBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6
  },
  severityText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  messageCard: {
    borderRadius: 12, padding: 14, marginBottom: 12
  },
  healthyMessageCard: { backgroundColor: '#e8f5e9' },
  diseaseMessageCard: { backgroundColor: '#fff8e1' },
  messageText: { fontSize: 14, color: '#333', lineHeight: 20 },

  statsRow: {
    backgroundColor: 'white', borderRadius: 14,
    padding: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 12, elevation: 2
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#e0e0e0' },

  treatmentCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 2
  },
  treatmentTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#333', marginBottom: 12
  },
  treatmentItem: {
    backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: 12, marginBottom: 8
  },
  chemicalItem: { backgroundColor: '#fff3e0' },
  preventionItem: { backgroundColor: '#e8f5e9' },
  treatmentLabel: {
    fontSize: 13, fontWeight: 'bold',
    color: '#555', marginBottom: 4
  },
  treatmentText: { fontSize: 14, color: '#444', lineHeight: 20 },

  healthyCard: {
    backgroundColor: '#e8f5e9', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#2e7d32'
  },
  healthyTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#2e7d32', marginBottom: 8
  },
  healthyText: { fontSize: 14, color: '#444', lineHeight: 20 },

  consultCard: {
    backgroundColor: '#fff3e0', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#e65100'
  },
  consultTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#e65100', marginBottom: 8
  },
  consultText: { fontSize: 14, color: '#444', lineHeight: 20 },

  actionButtons: { gap: 10, marginTop: 4 },
  shareBtn: {
    backgroundColor: '#1565c0', borderRadius: 12,
    padding: 16, alignItems: 'center'
  },
  shareBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  sharedBadge: {
    backgroundColor: '#e8f5e9', borderRadius: 12,
    padding: 16, alignItems: 'center'
  },
  sharedBadgeText: { color: '#2e7d32', fontWeight: 'bold', fontSize: 15 },
  scanAgainBtn: {
    backgroundColor: 'white', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  scanAgainBtnText: { color: '#2e7d32', fontWeight: 'bold', fontSize: 15 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  visibilityOption: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#e0e0e0', marginBottom: 10
  },
  selectedVisibility: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
  selectedVisibilityOrange: { borderColor: '#e65100', backgroundColor: '#fff3e0' },
  visibilityEmoji: { fontSize: 28 },
  visibilityInfo: { flex: 1 },
  visibilityTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  visibilityDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  checkmark: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f5f5f5',
    borderRadius: 12, padding: 14, alignItems: 'center'
  },
  cancelBtnText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  confirmBtn: {
    flex: 1, backgroundColor: '#2e7d32',
    borderRadius: 12, padding: 14, alignItems: 'center'
  },
  confirmBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
