import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator, ScrollView, Linking
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';

const VIOLET = '#6a1b9a';
const LIGHT_VIOLET = '#f3e5f5';

export default function AppointmentsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [prescribeModal, setPrescribeModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/my');
      setAppointments(res.data.data || []);
    } catch (error) {
      console.log('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      await fetchAppointments();
    } catch (error) {
      Alert.alert(t('error'), 'Could not update');
    }
  };

  const addMedicine = () => {
    setMedicines(prev => [
      ...prev,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]);
  };

  const updateMedicine = (index, field, value) => {
    setMedicines(prev => prev.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const removeMedicine = (index) => {
    if (medicines.length === 1) return;
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const submitPrescription = async () => {
    if (!diagnosis.trim()) {
      return Alert.alert(t('error'), 'Please enter diagnosis');
    }
    const validMedicines = medicines.filter(m => m.name.trim());
    if (validMedicines.length === 0) {
      return Alert.alert(t('error'), 'Please add at least one medicine');
    }
    try {
      await api.post(`/appointments/${selectedAppt._id}/prescription`, {
        diagnosis,
        medicines: validMedicines,
        advice,
        followUpDate
      });
      setPrescribeModal(false);
      setDiagnosis('');
      setAdvice('');
      setFollowUpDate('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      await fetchAppointments();
      Alert.alert(`✅ ${t('prescriptions')}!`, `Prescription sent to ${selectedAppt.patientName}`);
    } catch (error) {
      Alert.alert(t('error'), 'Could not send prescription');
    }
  };

  const getFilteredAppts = () => {
    if (activeTab === 'pending') return appointments.filter(a => a.status === 'pending');
    if (activeTab === 'confirmed') return appointments.filter(a => a.status === 'confirmed');
    if (activeTab === 'completed') return appointments.filter(a => a.status === 'completed');
    return appointments;
  };

  const getStatusColor = (status) => {
    if (status === 'confirmed') return '#2e7d32';
    if (status === 'pending') return '#f57f17';
    if (status === 'completed') return VIOLET;
    if (status === 'cancelled') return '#c62828';
    return '#666';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={VIOLET} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 {t('appointments')}</Text>
        <Text style={styles.headerSub}>Dr. {user?.name} — {user?.specialization || 'General Physician'}</Text>
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'pending', label: `⏳ ${t('pending')} (${appointments.filter(a => a.status === 'pending').length})` },
          { key: 'confirmed', label: `✅ ${t('confirmed')} (${appointments.filter(a => a.status === 'confirmed').length})` },
          { key: 'completed', label: `🏁 ${t('completed')}` },
          { key: 'all', label: `📋 All` }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredAppts()}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('no_cases')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.apptCard, { borderLeftColor: getStatusColor(item.status) }]}>
            <View style={styles.apptHeader}>
              <View style={styles.apptInfo}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.village}>📍 {item.village}</Text>
                <Text style={styles.symptoms}>🤒 {item.symptoms?.join(', ')}</Text>
                {item.scheduledDate ? (
                  <Text style={styles.time}>
                    📅 {item.scheduledDate} {item.scheduledTime ? `at ${item.scheduledTime}` : ''}
                  </Text>
                ) : null}
                {item.notes ? (
                  <Text style={styles.notes}>📝 {item.notes}</Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {item.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => updateStatus(item._id, 'confirmed')}
                  >
                    <Text style={styles.btnText}>✅ {t('accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => updateStatus(item._id, 'cancelled')}
                  >
                    <Text style={styles.btnText}>❌ {t('decline')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {(item.status === 'confirmed' || item.status === 'pending') && item.meetLink && (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => Linking.openURL(item.meetLink)}
                >
                  <Text style={styles.btnText}>🎥 {t('join_meet')}</Text>
                </TouchableOpacity>
              )}

              {(item.status === 'confirmed' || item.status === 'completed' || item.status === 'pending') && (
                <TouchableOpacity
                  style={styles.prescribeBtn}
                  onPress={() => {
                    setSelectedAppt(item);
                    setPrescribeModal(true);
                  }}
                >
                  <Text style={styles.btnText}>💊 {t('prescribe')}</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'confirmed' || item.status === 'completed' || item.status === 'pending') && (
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => navigation.navigate('Chat', {
                    appointmentId: item._id,
                    patientId: item.patientId?._id || item.patientId,
                    patientName: item.patientName,
                    doctorName: user?.name
                  })}
                >
                  <Text style={styles.btnText}>💬 {t('chat')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {/* Prescription Modal */}
      <Modal visible={prescribeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>💊 {t('write_prescription')}</Text>
                  <Text style={styles.modalSubTitle}>{t('patient_name')}: {selectedAppt?.patientName}</Text>
                </View>
                <TouchableOpacity onPress={() => setPrescribeModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>🏥 {t('diagnosis')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t('diagnosis')}
                value={diagnosis}
                onChangeText={setDiagnosis}
              />

              <Text style={styles.formLabel}>💊 {t('medicines')}</Text>
              {medicines.map((med, index) => (
                <View key={index} style={styles.medicineEntry}>
                  <View style={styles.medHeader}>
                    <Text style={styles.medTitle}>{t('medicines')} {index + 1}</Text>
                    {index > 0 && (
                      <TouchableOpacity onPress={() => removeMedicine(index)}>
                        <Text style={{ color: '#c62828', fontSize: 16 }}>❌ {t('delete')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={`${t('medicine_name')} *`}
                    value={med.name}
                    onChangeText={v => updateMedicine(index, 'name', v)}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={t('dosage')}
                      value={med.dosage}
                      onChangeText={v => updateMedicine(index, 'dosage', v)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={t('frequency')}
                      value={med.frequency}
                      onChangeText={v => updateMedicine(index, 'frequency', v)}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={t('duration')}
                      value={med.duration}
                      onChangeText={v => updateMedicine(index, 'duration', v)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Instructions"
                      value={med.instructions}
                      onChangeText={v => updateMedicine(index, 'instructions', v)}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addMedBtn} onPress={addMedicine}>
                <Text style={styles.addMedBtnText}>+ {t('add_reminder')}</Text>
              </TouchableOpacity>

              <Text style={styles.formLabel}>💬 {t('doctors_advice')}</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Rest, diet, activity instructions..."
                value={advice}
                onChangeText={setAdvice}
                multiline
              />

              <Text style={styles.formLabel}>🔄 {t('follow_up')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1 April 2026"
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />

              <TouchableOpacity style={styles.sendBtn} onPress={submitPrescription}>
                <Text style={styles.sendBtnText}>📤 {t('send_prescription')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_VIOLET },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: VIOLET, padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#ce93d8', marginTop: 4 },
  tabRow: {
    flexDirection: 'row', backgroundColor: 'white',
    padding: 8, gap: 4, elevation: 2
  },
  tab: {
    flex: 1, padding: 8, borderRadius: 8,
    alignItems: 'center', backgroundColor: '#f5f5f5'
  },
  activeTab: { backgroundColor: VIOLET },
  tabText: { fontSize: 10, fontWeight: '600', color: '#666', textAlign: 'center' },
  activeTabText: { color: 'white' },
  apptCard: {
    backgroundColor: 'white', borderRadius: 14,
    padding: 14, marginBottom: 10, elevation: 2,
    borderLeftWidth: 4
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start'
  },
  apptInfo: { flex: 1, marginRight: 8 },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  village: { fontSize: 13, color: '#666', marginTop: 2 },
  symptoms: { fontSize: 13, color: '#555', marginTop: 4 },
  time: { fontSize: 13, color: VIOLET, marginTop: 4 },
  notes: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  acceptBtn: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  declineBtn: { backgroundColor: '#c62828', borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  joinBtn: { backgroundColor: VIOLET, borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  prescribeBtn: { backgroundColor: '#1565c0', borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  chatBtn: {
    backgroundColor: '#00897b',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 14
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyCard: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#888' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: 'white', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, maxHeight: '92%'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubTitle: { fontSize: 13, color: VIOLET, marginTop: 4 },
  closeBtn: { fontSize: 22, color: '#666', padding: 4 },
  formLabel: {
    fontSize: 14, fontWeight: 'bold',
    color: '#333', marginBottom: 8, marginTop: 8
  },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 12, fontSize: 14, marginBottom: 8
  },
  medicineEntry: {
    backgroundColor: '#f9f9f9', borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  medHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8
  },
  medTitle: { fontSize: 14, fontWeight: 'bold', color: VIOLET },
  addMedBtn: {
    backgroundColor: LIGHT_VIOLET, borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: VIOLET, borderStyle: 'dashed'
  },
  addMedBtnText: { color: VIOLET, fontWeight: 'bold' },
  sendBtn: {
    backgroundColor: VIOLET, borderRadius: 12,
    padding: 16, alignItems: 'center',
    marginTop: 16, marginBottom: 8
  },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});