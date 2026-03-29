import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView
} from 'react-native';
import { getLiveLocation } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const ROLE_COLORS = {
  farmer: { primary: '#2e7d32', light: '#e8f5e9', badge: '#1b5e20' },
  villager: { primary: '#1565c0', light: '#e3f2fd', badge: '#0d47a1' },
  gramsevak: { primary: '#b71c1c', light: '#ffebee', badge: '#7f0000' },
  healthworker: { primary: '#b71c1c', light: '#ffebee', badge: '#7f0000' },
  doctor: { primary: '#6a1b9a', light: '#f3e5f5', badge: '#4a148c' },
};

export default function ProfileScreen() {
  const { user, logout, liveVillage } = useAuth();
  const { t } = useLanguage();
  const [liveLocation, setLiveLocation] = useState(null);
  const [coords, setCoords] = useState(null);

  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.villager;

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    if (liveVillage) setLiveLocation(liveVillage);
  }, [liveVillage]);

  const detectLocation = async () => {
    try {
      const location = await getLiveLocation();
      if (location?.name && location.name !== 'Unknown') {
        setLiveLocation(location.name);
        setCoords({
          lat: location.latitude?.toFixed(4),
          lon: location.longitude?.toFixed(4)
        });
      } else if (liveVillage) {
        setLiveLocation(liveVillage);
      }
    } catch (error) {
      console.log('Location error:', error.message);
      if (liveVillage) setLiveLocation(liveVillage);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => await logout()
        }
      ]
    );
  };

  const getRoleEmoji = (role) => {
    if (role === 'farmer') return '🧑‍🌾';
    if (role === 'villager') return '👨‍👩‍👧';
    if (role === 'gramsevak') return '👨‍⚕️';
    if (role === 'healthworker') return '👩‍⚕️';
    if (role === 'doctor') return '🩺';
    return '👤';
  };

  const getRoleLabel = (role) => {
    if (role === 'farmer') return t('farmer').toUpperCase();
    if (role === 'villager') return t('villager').toUpperCase();
    if (role === 'gramsevak') return t('gramsevak').toUpperCase();
    if (role === 'healthworker') return 'HEALTH WORKER';
    if (role === 'doctor') return t('doctor').toUpperCase();
    return 'USER';
  };

  const currentLocation = liveLocation || liveVillage || user?.village || t('detecting_location');

  return (
    <ScrollView style={[styles.container, { backgroundColor: roleColor.light }]}>
      <View style={[styles.header, { backgroundColor: roleColor.primary }]}>
        <Text style={styles.avatar}>{getRoleEmoji(user?.role)}</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>{getRoleLabel(user?.role)}</Text>
        <View style={[styles.villageBadge, { backgroundColor: roleColor.badge }]}>
          <Text style={styles.villageText}>📍 {currentLocation}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: roleColor.primary }]}>
          {t('my_details')}
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>📱 {t('phone')}</Text>
          <Text style={styles.infoValue}>{user?.phone}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>🌍 {t('language')}</Text>
          <Text style={styles.infoValue}>{user?.language?.toUpperCase()}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>📍 {t('live_location')}</Text>
          <Text style={[styles.infoValue, { color: roleColor.primary }]}>
            {currentLocation}
          </Text>
        </View>

        {coords && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>🌐 {t('coordinates')}</Text>
            <Text style={styles.infoValue}>{coords.lat}, {coords.lon}</Text>
          </View>
        )}

        {user?.role === 'farmer' && user?.landSize && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>🌾 {t('land_size')}</Text>
            <Text style={styles.infoValue}>{user?.landSize}</Text>
          </View>
        )}

        {user?.role === 'doctor' && (
          <>
            {user?.specialization && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>🩺 {t('specialization')}</Text>
                <Text style={styles.infoValue}>{user?.specialization}</Text>
              </View>
            )}
            {user?.qualification && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>🎓 {t('qualification')}</Text>
                <Text style={styles.infoValue}>{user?.qualification}</Text>
              </View>
            )}
            {user?.hospitalName && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>🏥 {t('hospital')}</Text>
                <Text style={styles.infoValue}>{user?.hospitalName}</Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: roleColor.primary }]}>{t('about')}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>📱 {t('app_version')}</Text>
          <Text style={styles.infoValue}>GramSeva v1.0</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>🛠️ {t('built_for')}</Text>
          <Text style={styles.infoValue}>{t('rural_india')} 🇮🇳</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: '#c62828' }]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>🚪 {t('logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', padding: 40, paddingTop: 60 },
  avatar: { fontSize: 70, marginBottom: 12 },
  name: { fontSize: 26, fontWeight: 'bold', color: 'white' },
  role: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)',
    marginTop: 4, letterSpacing: 2
  },
  villageBadge: {
    borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 6, marginTop: 10
  },
  villageText: { color: 'white', fontSize: 14 },
  section: { padding: 16, marginTop: 8 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold',
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1
  },
  infoCard: {
    backgroundColor: 'white', borderRadius: 12,
    padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', elevation: 2
  },
  infoLabel: { fontSize: 15, color: '#666' },
  infoValue: {
    fontSize: 15, fontWeight: '600',
    color: '#333', textAlign: 'right',
    flex: 1, marginLeft: 8
  },
  logoutBtn: {
    margin: 16, borderRadius: 12,
    padding: 18, alignItems: 'center', elevation: 3
  },
  logoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});