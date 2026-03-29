import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Linking
} from 'react-native';
import { getLiveLocation } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function VillagerHome({ navigation }) {
  const { user, liveVillage } = useAuth();
  const { t } = useLanguage();
  const [locationName, setLocationName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { detectLocation(); }, []);

  useEffect(() => {
    if (liveVillage) setLocationName(liveVillage);
  }, [liveVillage]);

  const detectLocation = async () => {
    try {
      const location = await getLiveLocation();
      if (location?.name && location.name !== 'Unknown') {
        setLocationName(location.name);
      } else {
        setLocationName(liveVillage || user?.village || '');
      }
    } catch (error) {
      console.log('Location error:', error.message);
      setLocationName(liveVillage || user?.village || '');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await detectLocation();
    setRefreshing(false);
  };

  const healthTips = [
    { emoji: '💧', tip: 'Drink at least 8 glasses of water daily' },
    { emoji: '🥗', tip: 'Eat fresh vegetables and fruits every day' },
    { emoji: '🏃', tip: 'Walk for 30 minutes every morning' },
    { emoji: '😴', tip: 'Sleep 7-8 hours every night' },
    { emoji: '🧼', tip: 'Wash hands before eating and after toilet' },
    { emoji: '🌿', tip: 'Avoid junk food and fried items' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('namaste')}</Text>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.village}>
            📍 {locationName || liveVillage || user?.village || t('detecting_location')}
          </Text>
        </View>
        <Text style={styles.headerEmoji}>👨‍👩‍👧</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#f3e5f5' }]}
          onPress={() => navigation.navigate('HealthHistory')}
        >
          <Text style={styles.actionEmoji}>📋</Text>
          <Text style={styles.actionLabel}>{t('health_history')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fff3e0' }]}
          onPress={() => navigation.navigate('MedicineReminders')}
        >
          <Text style={styles.actionEmoji}>💊</Text>
          <Text style={styles.actionLabel}>{t('med_reminders')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
          onPress={() => navigation.navigate('NearbyHealthCenters')}
        >
          <Text style={styles.actionEmoji}>🏥</Text>
          <Text style={styles.actionLabel}>{t('nearby_centers')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#ffebee' }]}
          onPress={() => navigation.navigate('Health')}
        >
          <Text style={styles.actionEmoji}>🤒</Text>
          <Text style={styles.actionLabel}>{t('check_symptoms')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e3f2fd' }]}
          onPress={() => navigation.navigate('Family')}
        >
          <Text style={styles.actionEmoji}>👨‍👩‍👧</Text>
          <Text style={styles.actionLabel}>{t('health_cards')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
          onPress={() => navigation.navigate('Community')}
        >
          <Text style={styles.actionEmoji}>👥</Text>
          <Text style={styles.actionLabel}>{t('community')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fff8e1' }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionEmoji}>👤</Text>
          <Text style={styles.actionLabel}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('daily_health_tips')}</Text>
      {healthTips.map((item, index) => (
        <View key={index} style={styles.tipCard}>
          <Text style={styles.tipEmoji}>{item.emoji}</Text>
          <Text style={styles.tipText}>{item.tip}</Text>
        </View>
      ))}

      <View style={styles.emergencyCard}>
        <Text style={styles.emergencyTitle}>{t('emergency_numbers')}</Text>
        <View style={styles.emergencyGrid}>
          {[
            { label: '🚑 Ambulance', number: '108' },
            { label: '🏥 Health Helpline', number: '104' },
            { label: '👮 Police', number: '100' },
            { label: '👩 Women Helpline', number: '1091' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.emergencyBtn}
              onPress={() => Linking.openURL(`tel:${item.number}`)}
            >
              <Text style={styles.emergencyBtnLabel}>{item.label}</Text>
              <Text style={styles.emergencyBtnNumber}>{item.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: '#1565c0', padding: 24,
    paddingTop: 50, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  greeting: { fontSize: 16, color: '#bbdefb' },
  name: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  village: { fontSize: 14, color: '#90caf9', marginTop: 4 },
  headerEmoji: { fontSize: 50 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#333',
    marginHorizontal: 16, marginTop: 16, marginBottom: 10
  },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8
  },
  actionCard: {
    width: '47%', borderRadius: 16,
    padding: 20, alignItems: 'center', elevation: 2
  },
  actionEmoji: { fontSize: 32, marginBottom: 8 },
  actionLabel: {
    fontSize: 14, fontWeight: '600',
    color: '#333', textAlign: 'center'
  },
  tipCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'white', borderRadius: 12,
    padding: 16, flexDirection: 'row',
    alignItems: 'center', elevation: 2
  },
  tipEmoji: { fontSize: 24, marginRight: 12 },
  tipText: { fontSize: 15, color: '#444', flex: 1 },
  emergencyCard: {
    margin: 16, backgroundColor: '#ffebee',
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#c62828'
  },
  emergencyTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#c62828', marginBottom: 12
  },
  emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emergencyBtn: {
    width: '47%', backgroundColor: 'white',
    borderRadius: 10, padding: 12, alignItems: 'center', elevation: 1
  },
  emergencyBtnLabel: { fontSize: 13, color: '#333', fontWeight: '600' },
  emergencyBtnNumber: {
    fontSize: 18, fontWeight: 'bold',
    color: '#c62828', marginTop: 4
  }
});