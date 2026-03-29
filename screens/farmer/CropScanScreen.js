import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert, ActivityIndicator, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CROPS = [
  { id: 'tomato', emoji: '🍅', label: 'Tomato' },
  { id: 'potato', emoji: '🥔', label: 'Potato' },
  { id: 'corn', emoji: '🌽', label: 'Corn' },
  { id: 'apple', emoji: '🍎', label: 'Apple' },
  { id: 'grape', emoji: '🍇', label: 'Grape' },
  { id: 'pepper', emoji: '🫑', label: 'Pepper' },
  { id: 'peach', emoji: '🍑', label: 'Peach' },
  { id: 'strawberry', emoji: '🍓', label: 'Strawberry' },
  { id: 'cherry', emoji: '🍒', label: 'Cherry' },
  { id: 'orange', emoji: '🍊', label: 'Orange' },
  { id: 'soybean', emoji: '🫘', label: 'Soybean' },
  { id: 'squash', emoji: '🎃', label: 'Squash' },
  { id: 'blueberry', emoji: '🫐', label: 'Blueberry' },
  { id: 'raspberry', emoji: '🍓', label: 'Raspberry' },
  { id: 'rice', emoji: '🌾', label: 'Rice' },
  { id: 'cotton', emoji: '🌿', label: 'Cotton' },
  { id: 'wheat', emoji: '🌾', label: 'Wheat' },
  { id: 'sugarcane', emoji: '🎋', label: 'Sugarcane' },
  { id: 'mango', emoji: '🥭', label: 'Mango' },
  { id: 'banana', emoji: '🍌', label: 'Banana' },
];

export default function CropScanScreen() {
  const { user, getVillage } = useAuth();
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cropType, setCropType] = useState('tomato');
  const [shareModal, setShareModal] = useState(false);
  const [shareVisibility, setShareVisibility] = useState('public');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const pickImage = async (useCamera) => {
    try {
      let response;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed', 'Allow camera access');
        response = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.3 });
      } else {
        response = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.3 });
      }
      if (!response.canceled) {
        setImage(response.assets[0].uri);
        setResult(null);
        setShared(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const scanCrop = async () => {
    if (!image) return Alert.alert('Error', 'Please select an image first');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: image, type: 'image/jpeg', name: 'crop.jpg' });
      formData.append('village', getVillage());
      formData.append('cropType', cropType);

      const response = await api.post('/crop/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setResult(response.data.data);
        setShared(false);
      } else {
        Alert.alert('Error', response.data.message || 'Scan failed');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Scan failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    setSharing(true);
    try {
      await api.post(`/crop/report/${result.reportId}/share`);

      const disease = result.diseaseName || result.disease || 'Unknown';
      const content = result.wrongCrop
        ? `⚠️ Wrong crop selected. Image shows ${result.actualCrop}. Disease: ${disease}. Severity: ${result.severity}.`
        : result.isHealthy
        ? `✅ My ${cropType} crop is healthy! ${result.farmerMessage || ''}`
        : `🌾 Crop Alert: My ${cropType} has ${disease}. Severity: ${result.severity}.\n🌿 Organic: ${result.treatment?.organic || 'N/A'}\n🧪 Chemical: ${result.treatment?.chemical || 'N/A'}\n🛡️ Prevention: ${result.treatment?.prevention || 'N/A'}`;

      await api.post('/community/post', {
        content,
        village: getVillage(),
        category: 'crop',
        visibility: shareVisibility
      });

      setShared(true);
      setShareModal(false);
      Alert.alert(
        'Shared ✅',
        shareVisibility === 'public'
          ? 'Report shared to all villagers!'
          : 'Report shared to Gram Sevak only!'
      );
    } catch (error) {
      Alert.alert('Error', 'Could not share report');
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📷 Crop Scanner</Text>
        <Text style={styles.headerSub}>AI powered disease detection</Text>
      </View>

      <Text style={styles.sectionLabel}>Select Your Crop</Text>
      <ScrollView
        horizontal showsHorizontalScrollIndicator
        contentContainerStyle={styles.cropScroll}
        nestedScrollEnabled
      >
        {CROPS.map(crop => (
          <TouchableOpacity
            key={crop.id}
            style={[styles.cropBtn, cropType === crop.id && styles.selectedCrop]}
            onPress={() => setCropType(crop.id)}
          >
            <Text style={styles.cropEmoji}>{crop.emoji}</Text>
            <Text style={[styles.cropLabel, cropType === crop.id && styles.selectedCropLabel]}>
              {crop.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.pickRow}>
        <TouchableOpacity
          style={[styles.pickBtn, { backgroundColor: '#e8f5e9' }]}
          onPress={() => pickImage(true)}
        >
          <Text style={styles.pickEmoji}>📸</Text>
          <Text style={styles.pickLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pickBtn, { backgroundColor: '#e3f2fd' }]}
          onPress={() => pickImage(false)}
        >
          <Text style={styles.pickEmoji}>🖼️</Text>
          <Text style={styles.pickLabel}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          <TouchableOpacity
            style={[styles.scanBtn, loading && { backgroundColor: '#aaa' }]}
            onPress={scanCrop}
            disabled={loading}
          >
            {loading
              ? <><ActivityIndicator color="white" /><Text style={styles.scanBtnText}> Analyzing...</Text></>
              : <Text style={styles.scanBtnText}>🔍 Analyze Crop</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>🌿 Analysis Result</Text>

          {result.wrongCrop && (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>⚠️ Wrong Crop Selected!</Text>
              <Text style={styles.warningDesc}>
                You selected {result.selectedCrop} but image shows {result.actualCrop}
              </Text>
            </View>
          )}

          {result.farmerMessage ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>💬 {result.farmerMessage}</Text>
            </View>
          ) : null}

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Disease:</Text>
            <Text style={styles.resultValue}>{result.diseaseName || result.disease || 'Unknown'}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Confidence:</Text>
            <Text style={styles.resultValue}>{result.confidence ? `${result.confidence}%` : 'N/A'}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Severity:</Text>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(result.severity) }]}>
              <Text style={styles.severityText}>{result.severity}</Text>
            </View>
          </View>

          <View style={styles.treatmentBox}>
            <Text style={styles.treatmentTitle}>💊 AI Treatment Advice</Text>
            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>🌿 Organic:</Text>
              <Text style={styles.treatmentText}>{result.treatment?.organic || 'N/A'}</Text>
            </View>
            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>🧪 Chemical:</Text>
              <Text style={styles.treatmentText}>{result.treatment?.chemical || 'N/A'}</Text>
            </View>
            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>🛡️ Prevention:</Text>
              <Text style={styles.treatmentText}>{result.treatment?.prevention || 'N/A'}</Text>
            </View>
          </View>

          {!shared ? (
            <TouchableOpacity style={styles.shareBtn} onPress={() => setShareModal(true)}>
              <Text style={styles.shareBtnText}>📢 Share to Community</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.sharedBadge}>
              <Text style={styles.sharedBadgeText}>✅ Shared to Community!</Text>
            </View>
          )}
        </View>
      )}

      {!image && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>🌾</Text>
          <Text style={styles.placeholderText}>
            Select crop type then take a photo to detect diseases instantly
          </Text>
        </View>
      )}

      <View style={{ height: 30 }} />

      <Modal visible={shareModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📢 Share Crop Report</Text>
            <Text style={styles.modalSubTitle}>Who should see this report?</Text>

            <TouchableOpacity
              style={[styles.visibilityOption, shareVisibility === 'public' && styles.selectedVisibility]}
              onPress={() => setShareVisibility('public')}
            >
              <Text style={styles.visibilityEmoji}>🌍</Text>
              <View style={styles.visibilityInfo}>
                <Text style={styles.visibilityTitle}>Public</Text>
                <Text style={styles.visibilityDesc}>All farmers and villagers can see</Text>
              </View>
              {shareVisibility === 'public' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.visibilityOption, shareVisibility === 'gramsevak_only' && styles.selectedVisibilityRed]}
              onPress={() => setShareVisibility('gramsevak_only')}
            >
              <Text style={styles.visibilityEmoji}>🔒</Text>
              <View style={styles.visibilityInfo}>
                <Text style={styles.visibilityTitle}>Gram Sevak Only</Text>
                <Text style={styles.visibilityDesc}>Only Gram Sevak and Doctor will see</Text>
              </View>
              {shareVisibility === 'gramsevak_only' && (
                <Text style={[styles.checkmark, { color: '#b71c1c' }]}>✓</Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShareModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, sharing && { backgroundColor: '#aaa' }]}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.confirmBtnText}>Share Now</Text>
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
  header: { backgroundColor: '#2e7d32', padding: 24, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#c8e6c9', marginTop: 4 },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', color: '#333', marginLeft: 16, marginTop: 16, marginBottom: 8 },
  cropScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 8, flexDirection: 'row' },
  cropBtn: { backgroundColor: 'white', borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 70, borderWidth: 2, borderColor: '#e0e0e0', elevation: 2 },
  selectedCrop: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
  cropEmoji: { fontSize: 24, marginBottom: 4 },
  cropLabel: { fontSize: 11, color: '#333', fontWeight: '600' },
  selectedCropLabel: { color: '#2e7d32' },
  pickRow: { flexDirection: 'row', margin: 16, gap: 12 },
  pickBtn: { flex: 1, borderRadius: 16, padding: 24, alignItems: 'center', elevation: 2 },
  pickEmoji: { fontSize: 36, marginBottom: 8 },
  pickLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  imageContainer: { margin: 16 },
  previewImage: { width: '100%', height: 250, borderRadius: 16, marginBottom: 12 },
  scanBtn: { backgroundColor: '#2e7d32', borderRadius: 12, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  scanBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  resultCard: { margin: 16, backgroundColor: 'white', borderRadius: 16, padding: 20, elevation: 3 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  warningCard: { backgroundColor: '#fff3e0', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f57c00' },
  warningText: { fontSize: 15, fontWeight: 'bold', color: '#f57c00' },
  warningDesc: { fontSize: 13, color: '#555', marginTop: 4 },
  messageCard: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, marginBottom: 12 },
  messageText: { fontSize: 14, color: '#2e7d32', lineHeight: 20 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultLabel: { fontSize: 15, color: '#666' },
  resultValue: { fontSize: 15, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'right' },
  severityBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  severityText: { color: 'white', fontWeight: 'bold' },
  treatmentBox: { backgroundColor: '#f1f8e9', borderRadius: 12, padding: 16, marginTop: 8 },
  treatmentTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 12 },
  treatmentItem: { marginBottom: 10 },
  treatmentLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  treatmentText: { fontSize: 14, color: '#444', lineHeight: 20 },
  shareBtn: { backgroundColor: '#1565c0', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  shareBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  sharedBadge: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  sharedBadgeText: { color: '#2e7d32', fontWeight: 'bold', fontSize: 15 },
  placeholder: { margin: 32, alignItems: 'center' },
  placeholderEmoji: { fontSize: 64, marginBottom: 16 },
  placeholderText: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  visibilityOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 2, borderColor: '#e0e0e0', marginBottom: 10 },
  selectedVisibility: { borderColor: '#2e7d32', backgroundColor: '#e8f5e9' },
  selectedVisibilityRed: { borderColor: '#b71c1c', backgroundColor: '#ffebee' },
  visibilityEmoji: { fontSize: 28 },
  visibilityInfo: { flex: 1 },
  visibilityTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  visibilityDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  checkmark: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: '#2e7d32', borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});