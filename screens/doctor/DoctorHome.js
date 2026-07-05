import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
  Switch, Alert, Linking
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function DoctorHome({ navigation }) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const PRIMARY = colors.doctor;
  const LIGHT = colors.doctorLight;

  const [appointments, setAppointments] = useState([]);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable !== false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

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

  // ── FIXED: Actually saves to backend ──
  const toggleAvailability = async (value) => {
    setSavingAvailability(true);
    try {
      await api.put('/users/availability', { isAvailable: value });
      setIsAvailable(value);
      await updateUser({ isAvailable: value });
      console.log(`✅ Availability updated: ${value}`);
    } catch (error) {
      console.log('Availability update error:', error.message);
      Alert.alert(t('error'), 'Could not update availability. Try again.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      await fetchData();
      if (status === 'confirmed') {
        Alert.alert(
          `✅ ${t('confirmed')}`,
          'Patient will be notified. Meeting link is ready!'
        );
      }
    } catch (error) {
      Alert.alert(t('error'), 'Could not update');
    }
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const confirmed = appointments.filter(a => a.status === 'confirmed');
  const completed = appointments.filter(a => a.status === 'completed');

  const getStatusColor = (status) => {
    if (status === 'confirmed') return colors.success;
    if (status === 'pending') return colors.warning;
    if (status === 'completed') return PRIMARY;
    if (status === 'cancelled') return colors.error;
    return colors.textMuted;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: LIGHT }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: PRIMARY }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{t('namaste')}</Text>
          <Text style={styles.name}>Dr. {user?.name}</Text>
          <Text style={styles.spec}>
            {user?.specialization || 'General Physician'}
          </Text>
          <Text style={styles.hospital}>
            🏥 {user?.hospitalName || 'N/A'}
          </Text>
        </View>
        <View style={styles.availSection}>
          <Text style={styles.availLabel}>
            {isAvailable ? t('available') : t('unavailable')}
          </Text>
          <Switch
            value={isAvailable}
            onValueChange={toggleAvailability}
            disabled={savingAvailability}
            trackColor={{ false: '#555', true: '#ce93d8' }}
            thumbColor={isAvailable ? 'white' : '#888'}
          />
          {savingAvailability && (
            <Text style={styles.savingText}>saving...</Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          {
            label: `⏳ ${t('pending')}`,
            value: pending.length,
            color: colors.warning,
            bg: colors.warningLight
          },
          {
            label: `✅ ${t('confirmed')}`,
            value: confirmed.length,
            color: colors.success,
            bg: colors.successLight
          },
          {
            label: `🏁 ${t('completed')}`,
            value: completed.length,
            color: PRIMARY,
            bg: LIGHT
          },
          {
            label: `📋 Total`,
            value: appointments.length,
            color: colors.text,
            bg: colors.surface
          },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.statNum, { color: s.color }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Pending Appointments */}
      {pending.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⏳ {t('pending')} ({pending.length})
          </Text>
          {pending.map((appt, i) => (
            <View key={i} style={[styles.apptCard, {
              backgroundColor: colors.surface,
              borderLeftColor: colors.warning
            }]}>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {appt.patientName}
              </Text>
              <Text style={[styles.patientVillage, { color: colors.textSecondary }]}>
                📍 {appt.village}
              </Text>
              <Text style={[styles.symptoms, { color: colors.textSecondary }]}>
                🤒 {appt.symptoms?.join(', ')}
              </Text>
              {appt.scheduledDate ? (
                <Text style={[styles.apptTime, { color: PRIMARY }]}>
                  📅 {appt.scheduledDate}
                  {appt.scheduledTime ? ` at ${appt.scheduledTime}` : ''}
                </Text>
              ) : null}
              {appt.notes ? (
                <Text style={[styles.notes, { color: colors.textMuted }]}>
                  📝 {appt.notes}
                </Text>
              ) : null}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: colors.success }]}
                  onPress={() => updateStatus(appt._id, 'confirmed')}
                >
                  <Text style={styles.actionBtnText}>✅ {t('accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.declineBtn, { backgroundColor: colors.error }]}
                  onPress={() => updateStatus(appt._id, 'cancelled')}
                >
                  <Text style={styles.actionBtnText}>❌ {t('decline')}</Text>
                </TouchableOpacity>
                {appt.meetLink && (
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: PRIMARY }]}
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

      {/* Confirmed Appointments */}
      {confirmed.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ✅ {t('confirmed')} ({confirmed.length})
          </Text>
          {confirmed.map((appt, i) => (
            <View key={i} style={[styles.apptCard, {
              backgroundColor: colors.surface,
              borderLeftColor: colors.success
            }]}>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {appt.patientName}
              </Text>
              <Text style={[styles.symptoms, { color: colors.textSecondary }]}>
                🤒 {appt.symptoms?.join(', ')}
              </Text>
              {appt.scheduledDate ? (
                <Text style={[styles.apptTime, { color: PRIMARY }]}>
                  📅 {appt.scheduledDate}
                  {appt.scheduledTime ? ` at ${appt.scheduledTime}` : ''}
                </Text>
              ) : null}
              <View style={styles.actionRow}>
                {appt.meetLink && (
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: PRIMARY }]}
                    onPress={() => Linking.openURL(appt.meetLink)}
                  >
                    <Text style={styles.actionBtnText}>
                      🎥 {t('join_video_call')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.prescribeBtn, { backgroundColor: colors.info }]}
                  onPress={() => navigation.navigate('Appointments')}
                >
                  <Text style={styles.actionBtnText}>
                    💊 {t('write_prescription')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {pending.length === 0 && confirmed.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t('no_cases')}
          </Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
            New appointment requests will appear here
          </Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 24, paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  spec: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  hospital: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  availSection: { alignItems: 'center', gap: 4 },
  availLabel: { fontSize: 11, color: 'white', textAlign: 'center' },
  savingText: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 12,
    alignItems: 'center', elevation: 2
  },
  statNum: { fontSize: 26, fontWeight: 'bold' },
  statLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold',
    marginHorizontal: 16, marginTop: 16, marginBottom: 10
  },
  apptCard: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 14,
    elevation: 2, borderLeftWidth: 4
  },
  patientName: { fontSize: 17, fontWeight: 'bold' },
  patientVillage: { fontSize: 13, marginTop: 2 },
  symptoms: { fontSize: 13, marginTop: 4 },
  apptTime: { fontSize: 13, marginTop: 4 },
  notes: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  acceptBtn: { borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  declineBtn: { borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  joinBtn: { borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  prescribeBtn: { borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emptyCard: { alignItems: 'center', padding: 40, margin: 16, borderRadius: 16 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: 'bold' },
  emptySubText: { fontSize: 14, marginTop: 6, textAlign: 'center' }
});
