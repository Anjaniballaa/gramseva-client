import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Linking
} from 'react-native';
import * as Location from 'expo-location';
import { getLocationName } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

export default function FarmerHome({ navigation }) {
  const { user, getVillage } = useAuth();
  const { t } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [recentScan, setRecentScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let weatherRes;

      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          const { latitude, longitude } = location.coords;
          const name = await getLocationName(latitude, longitude);
          setLocationName(name);
          weatherRes = await api.get(`/weather?lat=${latitude}&lon=${longitude}`);
        } catch (e) {
          console.log('GPS failed, using village:', e.message);
          weatherRes = await api.get(`/weather/${getVillage()}`);
          setLocationName(getVillage());
        }
      } else {
        weatherRes = await api.get(`/weather/${getVillage()}`);
        setLocationName(getVillage());
      }

      if (weatherRes?.data?.success) {
        setWeather(weatherRes.data.current);
        if (weatherRes.data.city) setLocationName(weatherRes.data.city);
      }

      const cropRes = await api.get('/crop/history');
      if (cropRes.data.data.length > 0) {
        setRecentScan(cropRes.data.data[0]);
      }
    } catch (error) {
      console.log('Error fetching data:', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getSeverityColor = (severity) => {
    if (severity === 'Severe') return '#c62828';
    if (severity === 'Moderate') return '#f57f17';
    if (severity === 'Mild') return '#f9a825';
    return '#2e7d32';
  };

  const getWeatherEmoji = (desc) => {
    const lower = desc?.toLowerCase() || '';
    if (lower.includes('clear')) return '☀️';
    if (lower.includes('cloud')) return '⛅';
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('thunder')) return '⛈️';
    if (lower.includes('mist') || lower.includes('fog')) return '🌫️';
    return '🌤️';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('namaste')}</Text>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.village}>📍 {locationName || getVillage()}</Text>
        </View>
        <Text style={styles.headerEmoji}>🧑‍🌾</Text>
      </View>

      {/* Weather Card */}
      <View style={styles.weatherCard}>
        <Text style={styles.cardTitle}>
          {getWeatherEmoji(weather?.description)} {t('todays_weather')}
        </Text>
        {weather ? (
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
            <View>
              <Text style={styles.weatherDesc}>{weather.description}</Text>
              <Text style={styles.weatherSub}>💧 Humidity: {weather.humidity}%</Text>
              <Text style={styles.weatherSub}>💨 Wind: {weather.wind_speed} km/h</Text>
              <Text style={styles.weatherSub}>↑{weather.temp_max}° ↓{weather.temp_min}°</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.loadingText}>{t('loading')}</Text>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e8f5e9' }]}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.actionEmoji}>📷</Text>
          <Text style={styles.actionLabel}>{t('scan_crop')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e3f2fd' }]}
          onPress={() => navigation.navigate('Weather')}
        >
          <Text style={styles.actionEmoji}>🌦️</Text>
          <Text style={styles.actionLabel}>{t('weather')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fff8e1' }]}
          onPress={() => navigation.navigate('Community')}
        >
          <Text style={styles.actionEmoji}>👥</Text>
          <Text style={styles.actionLabel}>{t('community')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fce4ec' }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionEmoji}>👤</Text>
          <Text style={styles.actionLabel}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Last Crop Scan */}
      <Text style={styles.sectionTitle}>{t('last_scan')}</Text>
      {recentScan ? (
        <View style={styles.scanCard}>
          <View style={styles.scanHeader}>
            <Text style={styles.diseaseName}>{recentScan.diseaseName}</Text>
            <View style={[styles.severityBadge,
              { backgroundColor: getSeverityColor(recentScan.severity) }]}>
              <Text style={styles.severityText}>{recentScan.severity}</Text>
            </View>
          </View>
          <Text style={styles.scanDate}>
            🕐 {new Date(recentScan.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.treatmentText}>
            💊 {recentScan.treatment?.organic}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyScan}>
          <Text style={styles.emptyText}>{t('no_scans')}</Text>
          <TouchableOpacity
            style={styles.scanNowBtn}
            onPress={() => navigation.navigate('Scan')}
          >
            <Text style={styles.scanNowText}>{t('scan_now')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SOS */}
      <View style={styles.sosCard}>
        <Text style={styles.sosTitle}>{t('agricultural_helplines')}</Text>
        <View style={styles.sosRow}>
          <TouchableOpacity
            style={[styles.sosBtn, { backgroundColor: '#c62828' }]}
            onPress={() => Linking.openURL('tel:18001801551')}
          >
            <Text style={styles.sosBtnText}>📞 Kisan Call Center</Text>
            <Text style={styles.sosNumber}>1800-180-1551</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sosBtn, { backgroundColor: '#1565c0' }]}
            onPress={() => Linking.openURL('tel:14447')}
          >
            <Text style={styles.sosBtnText}>📞 PM Kisan Helpline</Text>
            <Text style={styles.sosNumber}>14447</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  header: {
    backgroundColor: '#2e7d32', padding: 24,
    paddingTop: 50, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  greeting: { fontSize: 16, color: '#c8e6c9' },
  name: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  village: { fontSize: 14, color: '#a5d6a7', marginTop: 4 },
  headerEmoji: { fontSize: 50 },
  weatherCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 20, elevation: 3
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  weatherInfo: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  weatherTemp: { fontSize: 48, fontWeight: 'bold', color: '#2e7d32' },
  weatherDesc: { fontSize: 16, color: '#555', textTransform: 'capitalize' },
  weatherSub: { fontSize: 13, color: '#888', marginTop: 4 },
  loadingText: { color: '#999', fontStyle: 'italic' },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#333',
    marginHorizontal: 16, marginTop: 8, marginBottom: 10
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
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  scanCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 16, elevation: 3
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  diseaseName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  severityBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  severityText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  scanDate: { fontSize: 13, color: '#888', marginTop: 8 },
  treatmentText: { fontSize: 14, color: '#555', marginTop: 8 },
  emptyScan: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 24, alignItems: 'center', elevation: 2
  },
  emptyText: { fontSize: 16, color: '#999' },
  scanNowBtn: {
    marginTop: 12, backgroundColor: '#2e7d32',
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10
  },
  scanNowText: { color: 'white', fontWeight: 'bold' },
  sosCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 16, elevation: 3
  },
  sosTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  sosRow: { flexDirection: 'row', gap: 10 },
  sosBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  sosBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  sosNumber: { color: 'white', fontSize: 12, marginTop: 4 }
});