import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, ActivityIndicator,
  TextInput, Modal, ScrollView, Linking, Share
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const BLUE = '#1565c0';
const LIGHT_BLUE = '#e3f2fd';
const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
];

const getNext7Days = () => {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    days.push({
      day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()],
      date: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      full: `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
    });
  }

  return days;
};

export default function ConsultDoctorScreen() {
  const navigation = useNavigation();
  const { user, getVillage } = useAuth();
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doctors');
  const [bookingModal, setBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [form, setForm] = useState({
    symptoms: '',
    scheduledDate: '',
    scheduledTime: '',
    meetType: 'jitsi',
    notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [doctorsRes, apptRes, prescRes] = await Promise.all([
        api.get('/appointments/doctors'),
        api.get('/appointments/my'),
        api.get('/appointments/prescriptions')
      ]);
      setDoctors(doctorsRes.data.data || []);
      setAppointments(apptRes.data.data || []);
      setPrescriptions(prescRes.data.data || []);
    } catch (error) {
      console.log('Consult error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async () => {
    if (!form.symptoms.trim()) {
      return Alert.alert(t('error'), 'Please describe your symptoms');
    }
    try {
      const res = await api.post('/appointments/book', {
        doctorId: selectedDoctor._id,
        symptoms: form.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        meetType: form.meetType,
        notes: form.notes
      });

      setBookingModal(false);
      setForm({ symptoms: '', scheduledDate: '', scheduledTime: '', meetType: 'jitsi', notes: '' });
      await fetchData();
      setActiveTab('appointments');

      Alert.alert(
        `✅ ${t('book_appointment')}!`,
        `Dr. ${selectedDoctor.name} will confirm your appointment.\n\nMeeting link is ready for when confirmed.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Could not book appointment');
    }
  };

  const sharePrescription = async (prescription) => {
    const text = `
💊 PRESCRIPTION
━━━━━━━━━━━━━━━━━
Doctor: Dr. ${prescription.doctorName} (${prescription.doctorSpecialization})
Patient: ${prescription.patientName}
Date: ${new Date(prescription.createdAt).toLocaleDateString('en-IN')}

🏥 Diagnosis: ${prescription.diagnosis}

💊 Medicines:
${prescription.medicines?.map(m => `• ${m.name} ${m.dosage} — ${m.frequency} for ${m.duration}\n  ${m.instructions || ''}`).join('\n')}

💬 Advice: ${prescription.advice || 'None'}
🔄 Follow-up: ${prescription.followUpDate || 'Not specified'}

Shared from GramSeva App 🌾
    `;
    await Share.share({ message: text });
  };

  const sharePrescriptionToGramSevak = async (prescription) => {
    try {
      await api.post('/community/post', {
        content: `💊 Prescription Update: ${prescription.patientName} was diagnosed with ${prescription.diagnosis} by Dr. ${prescription.doctorName}. Medicines prescribed: ${prescription.medicines?.map(m => m.name).join(', ')}. Follow-up: ${prescription.followUpDate || 'N/A'}`,
        village: getVillage(),
        category: 'health'
      });
      Alert.alert(`${t('shared_community')} ✅`, 'Prescription shared to community. Gram Sevak will see it.');
    } catch (e) {
      Alert.alert(t('error'), 'Could not share');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'confirmed') return '#2e7d32';
    if (status === 'pending') return '#f57f17';
    if (status === 'completed') return BLUE;
    if (status === 'cancelled') return '#c62828';
    return '#666';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🩺 {t('consult_doctor')}</Text>
        <Text style={styles.headerSub}>{t('book_appointment')}, video call, get prescription</Text>
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'doctors', label: `👨‍⚕️ ${t('doctors')}` },
          { key: 'appointments', label: `📅 ${t('appointments')} (${appointments.length})` },
          { key: 'prescriptions', label: `💊 ${t('prescriptions')} (${prescriptions.length})` }
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

      {/* DOCTORS LIST */}
      {activeTab === 'doctors' && (
        <FlatList
          data={doctors}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👨‍⚕️</Text>
              <Text style={styles.emptyTitle}>{t('no_cases')}</Text>
              <Text style={styles.emptySubText}>Doctors will appear here once registered</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.doctorCard}>
              <View style={styles.doctorTop}>
                <View style={styles.doctorAvatarCircle}>
                  <Text style={styles.doctorAvatarText}>🩺</Text>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>Dr. {item.name}</Text>
                  <Text style={styles.doctorSpec}>{item.specialization || 'General Physician'}</Text>
                  <Text style={styles.doctorQual}>🎓 {item.qualification || 'MBBS'}</Text>
                  <Text style={styles.doctorHospital}>🏥 {item.hospitalName || 'N/A'}</Text>
                </View>
                <View style={[styles.availBadge,
                  { backgroundColor: item.isAvailable !== false ? '#2e7d32' : '#c62828' }]}>
                  <Text style={styles.availText}>
                    {item.isAvailable !== false ? `✅ Available` : `❌ Busy`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => {
                  setSelectedDoctor(item);
                  setBookingModal(true);
                }}
              >
                <Text style={styles.bookBtnText}>📅 {t('book_appointment')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <FlatList
          data={appointments}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>{t('no_cases')}</Text>
              <Text style={styles.emptySubText}>{t('book_appointment')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.appointmentCard}>
              <View style={styles.apptHeader}>
                <View style={styles.apptInfo}>
                  <Text style={styles.apptDoctor}>
                    Dr. {item.doctorId?.name || item.doctorName}
                  </Text>
                  <Text style={styles.apptSpec}>
                    {item.doctorId?.specialization || ''}
                  </Text>
                  <Text style={styles.apptSymptoms}>
                    🤒 {item.symptoms?.join(', ')}
                  </Text>
                  {item.scheduledDate ? (
                    <Text style={styles.apptDate}>
                      📅 {item.scheduledDate} {item.scheduledTime ? `at ${item.scheduledTime}` : ''}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text style={styles.apptNotes}>📝 {item.notes}</Text>
                  ) : null}
                </View>
                <View style={[styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              {item.status === 'pending' && (
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingText}>
                    ⏳ {t('waiting_confirm')}...
                  </Text>
                </View>
              )}

              {item.status === 'confirmed' && item.meetLink && (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => Linking.openURL(item.meetLink)}
                >
                  <Text style={styles.joinBtnText}>🎥 {t('join_video_call')}</Text>
                </TouchableOpacity>
              )}

              {item.followUpDate ? (
                <Text style={styles.followUp}>🔄 {t('follow_up')}: {item.followUpDate}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', {
                  appointmentId: item.appointmentId || item._id,
                  patientId: user?._id || user?.id,
                  patientName: user?.name,
                  doctorName: item.doctorId?.name || item.doctorName
                })}
              >
                <Text style={styles.chatBtnText}>💬 {t('chat')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <FlatList
          data={prescriptions}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>💊</Text>
              <Text style={styles.emptyTitle}>{t('no_cases')}</Text>
              <Text style={styles.emptySubText}>Prescriptions from doctors will appear here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.prescriptionCard}>
              <View style={styles.prescHeader}>
                <View>
                  <Text style={styles.prescDoctor}>Dr. {item.doctorName}</Text>
                  <Text style={styles.prescSpec}>{item.doctorSpecialization}</Text>
                </View>
                <Text style={styles.prescDate}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </Text>
              </View>

              <View style={styles.diagnosisBox}>
                <Text style={styles.diagnosisLabel}>🏥 {t('diagnosis')}</Text>
                <Text style={styles.diagnosisText}>{item.diagnosis}</Text>
              </View>

              {item.medicines?.length > 0 && (
                <View style={styles.medicinesBox}>
                  <Text style={styles.medicinesTitle}>💊 {t('medicines')}</Text>
                  {item.medicines.map((m, i) => (
                    <View key={i} style={styles.medicineRow}>
                      <Text style={styles.medicineName}>• {m.name} — {m.dosage}</Text>
                      <Text style={styles.medicineDose}>
                        {m.frequency} for {m.duration}
                      </Text>
                      {m.instructions ? (
                        <Text style={styles.medicineInst}>📝 {m.instructions}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {item.advice ? (
                <View style={styles.adviceBox}>
                  <Text style={styles.adviceLabel}>💬 {t('doctors_advice')}</Text>
                  <Text style={styles.adviceText}>{item.advice}</Text>
                </View>
              ) : null}

              {item.followUpDate ? (
                <Text style={styles.followUp}>🔄 {t('follow_up')}: {item.followUpDate}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', {
                  appointmentId: item.appointmentId || item._id,
                  patientId: user?._id || user?.id,
                  patientName: user?.name,
                  doctorName: item.doctorName
                })}
              >
                <Text style={styles.chatBtnText}>💬 {t('chat')}</Text>
              </TouchableOpacity>

              <View style={styles.shareRow}>
                <TouchableOpacity
                  style={styles.shareWhatsappBtn}
                  onPress={() => sharePrescription(item)}
                >
                  <Text style={styles.shareWhatsappText}>📤 {t('share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareGramSevakBtn}
                  onPress={() => sharePrescriptionToGramSevak(item)}
                >
                  <Text style={styles.shareGramSevakText}>👨‍⚕️ {t('share')} to {t('gramsevak')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Booking Modal */}
      <Modal visible={bookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('book_appointment')}</Text>
                  <Text style={styles.modalSubTitle}>
                    Dr. {selectedDoctor?.name} — {selectedDoctor?.specialization || 'General Physician'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setBookingModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>🤒 {t('select_symptoms')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="fever, headache, cough... (comma separated)"
                value={form.symptoms}
                onChangeText={v => setForm({ ...form, symptoms: v })}
                multiline
              />

              <Text style={styles.formLabel}>📅 Preferred Date</Text>
              <View style={styles.dateGrid}>
                {getNext7Days().map((day, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dateBtn,
                      form.scheduledDate === day.full && styles.selectedDateBtn
                    ]}
                    onPress={() => setForm({ ...form, scheduledDate: day.full })}
                  >
                    <Text style={[
                      styles.dateBtnDay,
                      form.scheduledDate === day.full && { color: 'white' }
                    ]}>
                      {day.day}
                    </Text>
                    <Text style={[
                      styles.dateBtnDate,
                      form.scheduledDate === day.full && { color: 'white' }
                    ]}>
                      {day.date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>🕐 Preferred Time</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((slot, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.timeBtn,
                      form.scheduledTime === slot && styles.selectedTimeBtn
                    ]}
                    onPress={() => setForm({ ...form, scheduledTime: slot })}
                  >
                    <Text style={[
                      styles.timeBtnText,
                      form.scheduledTime === slot && { color: 'white' }
                    ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>📹 Meeting Type</Text>
              <View style={styles.meetTypeRow}>
                {[
                  { id: 'jitsi', label: '🎥 Jitsi Meet', desc: 'Free, no login needed' },
                  { id: 'google_meet', label: '📹 Google Meet', desc: 'Needs Google account' }
                ].map(mt => (
                  <TouchableOpacity
                    key={mt.id}
                    style={[styles.meetTypeBtn,
                      form.meetType === mt.id && styles.selectedMeetType]}
                    onPress={() => setForm({ ...form, meetType: mt.id })}
                  >
                    <Text style={[styles.meetTypeLabel,
                      form.meetType === mt.id && { color: BLUE }]}>
                      {mt.label}
                    </Text>
                    <Text style={styles.meetTypeDesc}>{mt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>📝 {t('additional_info')}</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                placeholder={t('additional_info')}
                value={form.notes}
                onChangeText={v => setForm({ ...form, notes: v })}
                multiline
              />

              <TouchableOpacity style={styles.confirmBtn} onPress={bookAppointment}>
                <Text style={styles.confirmBtnText}>✅ {t('book_appointment')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_BLUE },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: BLUE, padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#bbdefb', marginTop: 4 },
  tabRow: {
    flexDirection: 'row', backgroundColor: 'white',
    padding: 8, gap: 6, elevation: 2
  },
  tab: {
    flex: 1, padding: 8, borderRadius: 8,
    alignItems: 'center', backgroundColor: '#f5f5f5'
  },
  activeTab: { backgroundColor: BLUE },
  tabText: { fontSize: 10, fontWeight: '600', color: '#666', textAlign: 'center' },
  activeTabText: { color: 'white' },
  doctorCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: BLUE
  },
  doctorTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  doctorAvatarCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: LIGHT_BLUE, alignItems: 'center',
    justifyContent: 'center', marginRight: 12
  },
  doctorAvatarText: { fontSize: 24 },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  doctorSpec: { fontSize: 14, color: BLUE, marginTop: 2 },
  doctorQual: { fontSize: 13, color: '#666', marginTop: 2 },
  doctorHospital: { fontSize: 13, color: '#555', marginTop: 2 },
  availBadge: { borderRadius: 8, padding: 6, alignItems: 'center' },
  availText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  bookBtn: {
    backgroundColor: BLUE, borderRadius: 10,
    padding: 12, alignItems: 'center'
  },
  bookBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  appointmentCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: BLUE
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start'
  },
  apptInfo: { flex: 1, marginRight: 8 },
  apptDoctor: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  apptSpec: { fontSize: 13, color: BLUE, marginTop: 2 },
  apptSymptoms: { fontSize: 13, color: '#555', marginTop: 6 },
  apptDate: { fontSize: 13, color: BLUE, marginTop: 4 },
  apptNotes: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  pendingBox: {
    backgroundColor: '#fff8e1', borderRadius: 8,
    padding: 10, marginTop: 10
  },
  pendingText: { fontSize: 13, color: '#f57f17', textAlign: 'center' },
  joinBtn: {
    backgroundColor: '#2e7d32', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 12
  },
  joinBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  followUp: { fontSize: 13, color: BLUE, marginTop: 8, fontWeight: '600' },
  prescriptionCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: '#6a1b9a'
  },
  prescHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12
  },
  prescDoctor: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  prescSpec: { fontSize: 13, color: '#6a1b9a', marginTop: 2 },
  prescDate: { fontSize: 12, color: '#888' },
  diagnosisBox: {
    backgroundColor: '#fce4ec', borderRadius: 10,
    padding: 12, marginBottom: 10
  },
  diagnosisLabel: { fontSize: 13, fontWeight: 'bold', color: '#c62828', marginBottom: 4 },
  diagnosisText: { fontSize: 14, color: '#333' },
  medicinesBox: {
    backgroundColor: '#f3e5f5', borderRadius: 10,
    padding: 12, marginBottom: 10
  },
  medicinesTitle: { fontSize: 14, fontWeight: 'bold', color: '#6a1b9a', marginBottom: 8 },
  medicineRow: { marginBottom: 8 },
  medicineName: { fontSize: 14, fontWeight: '600', color: '#333' },
  medicineDose: { fontSize: 13, color: '#555', marginTop: 2 },
  medicineInst: { fontSize: 12, color: '#888', marginTop: 2 },
  adviceBox: {
    backgroundColor: '#e8f5e9', borderRadius: 10,
    padding: 12, marginBottom: 10
  },
  adviceLabel: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32', marginBottom: 4 },
  adviceText: { fontSize: 14, color: '#333' },
  shareRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  shareWhatsappBtn: {
    flex: 1, backgroundColor: '#e8f5e9',
    borderRadius: 10, padding: 10, alignItems: 'center'
  },
  shareWhatsappText: { color: '#2e7d32', fontWeight: 'bold', fontSize: 13 },
  shareGramSevakBtn: {
    flex: 1, backgroundColor: '#fff3e0',
    borderRadius: 10, padding: 10, alignItems: 'center'
  },
  shareGramSevakText: { color: '#bf360c', fontWeight: 'bold', fontSize: 12 },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
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
  modalSubTitle: { fontSize: 13, color: BLUE, marginTop: 4 },
  closeBtn: { fontSize: 22, color: '#666', padding: 4 },
  formLabel: {
    fontSize: 14, fontWeight: 'bold',
    color: '#333', marginBottom: 8, marginTop: 8
  },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 14, fontSize: 15, marginBottom: 10
  },
  meetTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  meetTypeBtn: {
    flex: 1, backgroundColor: '#f5f5f5',
    borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 2, borderColor: '#e0e0e0'
  },
  selectedMeetType: { borderColor: BLUE, backgroundColor: LIGHT_BLUE },
  meetTypeLabel: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  meetTypeDesc: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    padding: 16, alignItems: 'center',
    marginTop: 16, marginBottom: 8
  },
  confirmBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  dateBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0',
    alignItems: 'center', minWidth: 70
  },
  selectedDateBtn: { backgroundColor: BLUE, borderColor: BLUE },
  dateBtnDay: { fontSize: 11, color: '#666', fontWeight: '600' },
  dateBtnDate: { fontSize: 13, color: '#333', fontWeight: 'bold', marginTop: 2 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  timeBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  selectedTimeBtn: { backgroundColor: BLUE, borderColor: BLUE },
  timeBtnText: { fontSize: 13, color: '#333', fontWeight: '600' },
  chatBtn: {
    backgroundColor: '#e3f2fd', borderRadius: 8,
    padding: 10, paddingHorizontal: 14, marginTop: 10
  },
  chatBtnText: { color: '#1565c0', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
});