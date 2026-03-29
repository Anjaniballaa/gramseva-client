import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Switch, Linking, Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const VIOLET = '#6a1b9a';
const LIGHT_VIOLET = '#f3e5f5';

export default function DoctorHome({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/appointments/my');
      setAppointments(res.data.data || []);
    } catch (error) {
      console.log('Doctor home error:', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      await fetchData();
      if (status === 'confirmed') {
        Alert.alert(`✅ ${t('confirmed')}`, 'Patient will be notified. Meeting link is ready!');
      }
    } catch (error) {
      Alert.alert(t('error'), 'Could not update');
    }
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const confirmed = appointments.filter(a => a.status === 'confirmed');
  const completed = appointments.filter(a => a.status === 'completed');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{t('namaste')} 🙏</Text>
          <Text style={styles.name}>Dr. {user?.name}</Text>
          <Text style={styles.spec}>{user?.specialization || 'General Physician'}</Text>
          <Text style={styles.hospital}>🏥 {user?.hospitalName || 'N/A'}</Text>
        </View>
        <View style={styles.availSection}>
          <Text style={styles.availLabel}>
            {isAvailable ? `✅ Available` : `❌ Busy`}
          </Text>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: '#ccc', true: '#ce93d8' }}
            thumbColor={isAvailable ? VIOLET : '#666'}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: `⏳ ${t('pending')}`, value: pending.length, color: '#f57f17', bg: '#fff8e1' },
          { label: `✅ ${t('confirmed')}`, value: confirmed.length, color: '#2e7d32', bg: '#e8f5e9' },
          { label: `🏁 ${t('completed')}`, value: completed.length, color: VIOLET, bg: LIGHT_VIOLET },
          { label: `📋 Total`, value: appointments.length, color: '#333', bg: '#f5f5f5' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Pending */}
      {pending.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>⏳ {t('pending')} ({pending.length})</Text>
          {pending.map((appt, i) => (
            <View key={i} style={[styles.apptCard, { borderLeftColor: '#f57f17' }]}>
              <Text style={styles.patientName}>{appt.patientName}</Text>
              <Text style={styles.patientVillage}>📍 {appt.village}</Text>
              <Text style={styles.symptoms}>🤒 {appt.symptoms?.join(', ')}</Text>
              {appt.scheduledDate ? (
                <Text style={styles.apptTime}>
                  📅 {appt.scheduledDate} {appt.scheduledTime ? `at ${appt.scheduledTime}` : ''}
                </Text>
              ) : null}
              {appt.notes ? <Text style={styles.notes}>📝 {appt.notes}</Text> : null}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => updateStatus(appt._id, 'confirmed')}
                >
                  <Text style={styles.actionBtnText}>✅ {t('accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => updateStatus(appt._id, 'cancelled')}
                >
                  <Text style={styles.actionBtnText}>❌ {t('decline')}</Text>
                </TouchableOpacity>
                {appt.meetLink && (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => Linking.openURL(appt.meetLink)}
                  >
                    <Text style={styles.actionBtnText}>🎥 {t('join_meet')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {/* Confirmed */}
      {confirmed.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>✅ {t('confirmed')} ({confirmed.length})</Text>
          {confirmed.map((appt, i) => (
            <View key={i} style={[styles.apptCard, { borderLeftColor: '#2e7d32' }]}>
              <Text style={styles.patientName}>{appt.patientName}</Text>
              <Text style={styles.symptoms}>🤒 {appt.symptoms?.join(', ')}</Text>
              {appt.scheduledDate ? (
                <Text style={styles.apptTime}>
                  📅 {appt.scheduledDate} {appt.scheduledTime ? `at ${appt.scheduledTime}` : ''}
                </Text>
              ) : null}
              <View style={styles.actionRow}>
                {appt.meetLink && (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => Linking.openURL(appt.meetLink)}
                  >
                    <Text style={styles.actionBtnText}>🎥 {t('join_video_call')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.prescribeBtn]}
                  onPress={() => navigation.navigate('Appointments')}
                >
                  <Text style={styles.actionBtnText}>💊 {t('write_prescription')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {pending.length === 0 && confirmed.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyText}>{t('no_cases')}</Text>
          <Text style={styles.emptySubText}>New appointment requests will appear here</Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_VIOLET },
  header: {
    backgroundColor: VIOLET, padding: 24,
    paddingTop: 50, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start'
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: '#ce93d8' },
  name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  spec: { fontSize: 14, color: '#ce93d8', marginTop: 2 },
  hospital: { fontSize: 13, color: '#ce93d8', marginTop: 2 },
  availSection: { alignItems: 'center', gap: 6 },
  availLabel: { fontSize: 11, color: 'white', textAlign: 'center' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 12,
    alignItems: 'center', elevation: 2
  },
  statNum: { fontSize: 26, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#333', marginHorizontal: 16,
    marginTop: 16, marginBottom: 10
  },
  apptCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'white', borderRadius: 14,
    padding: 14, elevation: 2, borderLeftWidth: 4
  },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  patientVillage: { fontSize: 13, color: '#666', marginTop: 2 },
  symptoms: { fontSize: 13, color: '#555', marginTop: 4 },
  apptTime: { fontSize: 13, color: VIOLET, marginTop: 4 },
  notes: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  acceptBtn: { backgroundColor: '#2e7d32', borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  declineBtn: { backgroundColor: '#c62828', borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  joinBtn: { backgroundColor: VIOLET, borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  prescribeBtn: { backgroundColor: '#1565c0', borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' }
});