import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, TextInput,
  Modal, ScrollView, Switch, Platform
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';

const BLUE = '#1565c0';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const FREQUENCIES = [
  { id: 'once', label: 'Once daily' },
  { id: 'twice', label: 'Twice daily' },
  { id: 'thrice', label: 'Three times daily' },
  { id: 'four', label: 'Four times daily' },
];

const TIMES = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM',
  '9:00 PM', '10:00 PM'
];

export default function MedicineReminderScreen({ navigation }) {
  const { t } = useLanguage();
  const [reminders, setReminders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'once',
    times: ['8:00 AM'],
    duration: '',
    notes: '',
    enabled: true
  });

  useEffect(() => {
    requestPermissions();
    loadReminders();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow notifications to receive medicine reminders'
      );
    }
  };

  const loadReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem('medicine_reminders');
      if (saved) setReminders(JSON.parse(saved));
    } catch (e) {
      console.log('Load reminders error:', e.message);
    }
  };

  const saveReminders = async (updatedReminders) => {
    try {
      await AsyncStorage.setItem('medicine_reminders', JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
    } catch (e) {
      console.log('Save reminders error:', e.message);
    }
  };

  const scheduleNotification = async (reminder) => {
    const notificationIds = [];

    for (const time of reminder.times) {
      const [timePart, period] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 ${t('med_reminders')}`,
            body: `Time to take ${reminder.medicineName} ${reminder.dosage}`,
            data: { reminderId: reminder.id },
            sound: true,
          },
          trigger: {
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
        notificationIds.push(id);
      } catch (e) {
        console.log('Schedule notification error:', e.message);
      }
    }

    return notificationIds;
  };

  const cancelNotifications = async (notificationIds) => {
    for (const id of notificationIds || []) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (e) {
        console.log('Cancel notification error:', e.message);
      }
    }
  };

  const addReminder = async () => {
    if (!form.medicineName.trim()) {
      return Alert.alert(t('error'), `Please enter ${t('medicine_name')}`);
    }

    const reminder = {
      id: Date.now().toString(),
      ...form,
      createdAt: new Date().toISOString()
    };

    const notificationIds = await scheduleNotification(reminder);
    reminder.notificationIds = notificationIds;

    const updated = [...reminders, reminder];
    await saveReminders(updated);
    setModalVisible(false);
    resetForm();
    Alert.alert(`✅ ${t('set_reminder')}!`, `You will be reminded to take ${reminder.medicineName}`);
  };

  const toggleReminder = async (id) => {
    const updated = await Promise.all(reminders.map(async r => {
      if (r.id === id) {
        if (r.enabled) {
          await cancelNotifications(r.notificationIds);
          return { ...r, enabled: false };
        } else {
          const notificationIds = await scheduleNotification(r);
          return { ...r, enabled: true, notificationIds };
        }
      }
      return r;
    }));
    await saveReminders(updated);
  };

  const deleteReminder = async (id) => {
    Alert.alert(t('remove_reminder'), `Remove this medicine reminder?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          const reminder = reminders.find(r => r.id === id);
          await cancelNotifications(reminder?.notificationIds);
          const updated = reminders.filter(r => r.id !== id);
          await saveReminders(updated);
        }
      }
    ]);
  };

  const resetForm = () => {
    setForm({
      medicineName: '', dosage: '',
      frequency: 'once', times: ['8:00 AM'],
      duration: '', notes: '', enabled: true
    });
  };

  const updateTimes = (frequency) => {
    const defaultTimes = {
      once: ['8:00 AM'],
      twice: ['8:00 AM', '8:00 PM'],
      thrice: ['8:00 AM', '2:00 PM', '8:00 PM'],
      four: ['8:00 AM', '12:00 PM', '4:00 PM', '8:00 PM']
    };
    setForm(prev => ({
      ...prev,
      frequency,
      times: defaultTimes[frequency] || ['8:00 AM']
    }));
  };

  const updateTime = (index, time) => {
    const newTimes = [...form.times];
    newTimes[index] = time;
    setForm(prev => ({ ...prev, times: newTimes }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>💊 {t('medicine_reminders')}</Text>
          <Text style={styles.headerSub}>{reminders.length} {t('active_reminders')}</Text>
        </View>
      </View>

      <FlatList
        data={reminders}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>{t('no_reminders')}</Text>
            <Text style={styles.emptySub}>
              {t('add_reminders_desc')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.reminderCard, !item.enabled && { opacity: 0.6 }]}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderInfo}>
                <Text style={styles.medicineName}>{item.medicineName}</Text>
                <Text style={styles.dosage}>{item.dosage}</Text>
                <Text style={styles.frequency}>
                  🔄 {FREQUENCIES.find(f => f.id === item.frequency)?.label}
                </Text>
                <View style={styles.timesRow}>
                  {item.times?.map((t_val, i) => (
                    <View key={i} style={styles.timeTag}>
                      <Text style={styles.timeTagText}>🕐 {t_val}</Text>
                    </View>
                  ))}
                </View>
                {item.duration ? (
                  <Text style={styles.duration}>📅 {t('duration')}: {item.duration}</Text>
                ) : null}
                {item.notes ? (
                  <Text style={styles.notes}>📝 {item.notes}</Text>
                ) : null}
              </View>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleReminder(item.id)}
                trackColor={{ false: '#ddd', true: '#bbdefb' }}
                thumbColor={item.enabled ? BLUE : '#aaa'}
              />
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteReminder(item.id)}
            >
              <Text style={styles.deleteBtnText}>🗑️ {t('remove_reminder')}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ {t('add_reminder')}</Text>
          </TouchableOpacity>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>💊 {t('add_reminder')}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>💊 {t('medicine_name')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Paracetamol, Metformin"
                value={form.medicineName}
                onChangeText={v => setForm({ ...form, medicineName: v })}
              />

              <Text style={styles.formLabel}>📏 {t('dosage')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500mg, 1 tablet"
                value={form.dosage}
                onChangeText={v => setForm({ ...form, dosage: v })}
              />

              <Text style={styles.formLabel}>🔄 {t('frequency')}</Text>
              <View style={styles.freqRow}>
                {FREQUENCIES.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.freqBtn,
                      form.frequency === f.id && styles.selectedFreq]}
                    onPress={() => updateTimes(f.id)}
                  >
                    <Text style={[styles.freqText,
                      form.frequency === f.id && { color: 'white' }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>🕐 {t('reminder_times')}</Text>
              {form.times.map((time, index) => (
                <View key={index} style={styles.timeSelector}>
                  <Text style={styles.timeSelectorLabel}>
                    Dose {index + 1}:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.timesScrollRow}>
                      {TIMES.map(t_val => (
                        <TouchableOpacity
                          key={t_val}
                          style={[styles.timeOption,
                            time === t_val && styles.selectedTime]}
                          onPress={() => updateTime(index, t_val)}
                        >
                          <Text style={[styles.timeOptionText,
                            time === t_val && { color: 'white' }]}>
                            {t_val}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ))}

              <Text style={styles.formLabel}>📅 {t('duration')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 7 days, 1 month"
                value={form.duration}
                onChangeText={v => setForm({ ...form, duration: v })}
              />

              <Text style={styles.formLabel}>📝 {t('notes')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Take after food"
                value={form.notes}
                onChangeText={v => setForm({ ...form, notes: v })}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={addReminder}>
                <Text style={styles.saveBtnText}>✅ {t('set_reminder')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: BLUE, padding: 16,
    paddingTop: 50, flexDirection: 'row',
    alignItems: 'center', gap: 12
  },
  backBtn: { fontSize: 24, color: 'white', padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#bbdefb', marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8 },
  reminderCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: BLUE
  },
  reminderHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12
  },
  reminderInfo: { flex: 1, marginRight: 10 },
  medicineName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  dosage: { fontSize: 14, color: BLUE, marginTop: 2 },
  frequency: { fontSize: 13, color: '#555', marginTop: 4 },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  timeTag: {
    backgroundColor: '#e3f2fd', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4
  },
  timeTagText: { color: BLUE, fontSize: 12, fontWeight: '600' },
  duration: { fontSize: 12, color: '#666', marginTop: 4 },
  notes: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  deleteBtn: {
    backgroundColor: '#ffebee', borderRadius: 8,
    padding: 10, alignItems: 'center'
  },
  deleteBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 13 },
  addBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    padding: 18, alignItems: 'center',
    marginTop: 8, marginBottom: 20
  },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
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
    alignItems: 'center', marginBottom: 16
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeBtn: { fontSize: 20, color: '#666' },
  formLabel: {
    fontSize: 14, fontWeight: 'bold',
    color: '#333', marginBottom: 8, marginTop: 8
  },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 14, fontSize: 15, marginBottom: 10
  },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  freqBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  selectedFreq: { backgroundColor: BLUE, borderColor: BLUE },
  freqText: { fontSize: 12, color: '#333', fontWeight: '600' },
  timeSelector: { marginBottom: 12 },
  timeSelectorLabel: {
    fontSize: 13, fontWeight: 'bold',
    color: '#555', marginBottom: 6
  },
  timesScrollRow: { flexDirection: 'row', gap: 8 },
  timeOption: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  selectedTime: { backgroundColor: BLUE, borderColor: BLUE },
  timeOptionText: { fontSize: 12, color: '#333', fontWeight: '600' },
  saveBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    padding: 16, alignItems: 'center',
    marginTop: 16, marginBottom: 8
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});