import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native';
import { getLiveLocation } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const getWeatherEmoji = (desc) => {
  const lower = desc?.toLowerCase() || '';
  if (lower.includes('clear')) return '☀️';
  if (lower.includes('few clouds')) return '🌤️';
  if (lower.includes('scattered')) return '⛅';
  if (lower.includes('broken') || lower.includes('overcast')) return '☁️';
  if (lower.includes('shower') || lower.includes('drizzle')) return '🌦️';
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('thunder')) return '⛈️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('mist') || lower.includes('fog') || lower.includes('haze')) return '🌫️';
  return '🌤️';
};

export default function WeatherScreen() {
  const { user, getVillage, liveVillage } = useAuth();
  const { t } = useLanguage();
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [advisory, setAdvisory] = useState([]);
  const [cropAdvisory, setCropAdvisory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchWeather(); }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError('');

      const location = await getLiveLocation();

      if (location && location.latitude && location.longitude) {
        const { latitude, longitude, name } = location;

        if (name && name !== 'Unknown') setLocationName(name);

        const res = await api.get(
          `/weather?lat=${latitude}&lon=${longitude}&locationName=${encodeURIComponent(name || getVillage())}`
        );

        if (res.data.success) {
          setCurrent(res.data.current);
          setForecast(res.data.forecast || []);
          setAdvisory(res.data.advisory || []);
          setCropAdvisory(res.data.cropAdvisory || null);
          if (res.data.city) setLocationName(res.data.city);
        }
      } else {
        await fetchWeatherByVillage();
      }
    } catch (error) {
      console.log('Weather error:', error.message);
      await fetchWeatherByVillage();
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByVillage = async () => {
    try {
      const village = getVillage() || 'Hyderabad';
      setLocationName(village);
      const res = await api.get(`/weather/${village}`);
      if (res.data.success) {
        setCurrent(res.data.current);
        setForecast(res.data.forecast || []);
        setAdvisory(res.data.advisory || []);
        setCropAdvisory(res.data.cropAdvisory || null);
        if (res.data.city) setLocationName(res.data.city);
      }
    } catch (error) {
      setError('Could not fetch weather. Check internet connection.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWeather();
    setRefreshing(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>{t('loading')}...</Text>
      </View>
    );
  }

  if (error && !current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>🌦️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchWeather}>
          <Text style={styles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header — Green */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>
          {current ? getWeatherEmoji(current.description) : '🌤️'}
        </Text>
        <Text style={styles.headerTitle}>{t('weather')}</Text>
        <Text style={styles.headerSub}>📍 {locationName || liveVillage || getVillage()}</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </Text>
      </View>

      {/* Current Weather */}
      {current && (
        <View style={styles.currentCard}>
          <View style={styles.currentTop}>
            <View style={styles.currentLeft}>
              <Text style={styles.currentTemp}>{current.temp}°C</Text>
              <Text style={styles.currentFeels}>Feels like {current.feels_like}°C</Text>
              <Text style={styles.currentDesc}>{current.description}</Text>
              <Text style={styles.currentMinMax}>↑{current.temp_max}° ↓{current.temp_min}°</Text>
            </View>
            <Text style={styles.currentBigEmoji}>
              {getWeatherEmoji(current.description)}
            </Text>
          </View>

          <View style={styles.currentGrid}>
            {[
              { val: `${current.humidity}%`, label: '💧 Humidity' },
              { val: `${current.wind_speed} km/h`, label: '💨 Wind' },
              { val: `${current.pressure} hPa`, label: '📊 Pressure' },
              { val: `${current.cloudcover}%`, label: '☁️ Cloud' },
              { val: formatTime(current.sunrise), label: '🌅 Sunrise' },
              { val: formatTime(current.sunset), label: '🌇 Sunset' },
            ].map((item, i) => (
              <View key={i} style={styles.gridItem}>
                <Text style={styles.gridVal}>{item.val}</Text>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* AI Crop Advisory — Dynamic from Gemini */}
      {cropAdvisory && (
        <View style={styles.cropAdvisoryCard}>
          <Text style={styles.cropAdvisoryTitle}>
            🌾 {t('ai_crop_advisory')} — {cropAdvisory.region || locationName}
          </Text>
          <Text style={styles.cropSeason}>
            📅 {t('season')}: {cropAdvisory.season}
          </Text>

          {cropAdvisory.seasonal_tip && (
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>💡 {t('seasonal_tip')}</Text>
              <Text style={styles.tipText}>{cropAdvisory.seasonal_tip}</Text>
            </View>
          )}

          <Text style={styles.cropSubLabel}>✅ {t('recommended_crops')}:</Text>
          <View style={styles.cropsRow}>
            {cropAdvisory.recommended_crops?.map((crop, i) => (
              <View key={i} style={styles.cropTag}>
                <Text style={styles.cropTagText}>{crop}</Text>
              </View>
            ))}
          </View>

          {cropAdvisory.avoid_crops?.length > 0 && (
            <>
              <Text style={styles.cropSubLabel}>❌ {t('avoid_crops')}:</Text>
              <View style={styles.cropsRow}>
                {cropAdvisory.avoid_crops.map((crop, i) => (
                  <View key={i} style={[styles.cropTag, { backgroundColor: '#ffebee' }]}>
                    <Text style={[styles.cropTagText, { color: '#c62828' }]}>{crop}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {cropAdvisory.irrigation_tip && (
            <View style={[styles.tipBox, { backgroundColor: '#e3f2fd' }]}>
              <Text style={[styles.tipLabel, { color: '#1565c0' }]}>💧 {t('irrigation')}</Text>
              <Text style={styles.tipText}>{cropAdvisory.irrigation_tip}</Text>
            </View>
          )}

          {cropAdvisory.pest_alert && (
            <View style={[styles.tipBox, { backgroundColor: '#fff3e0' }]}>
              <Text style={[styles.tipLabel, { color: '#f57f17' }]}>🦟 {t('pest_alert')}</Text>
              <Text style={styles.tipText}>{cropAdvisory.pest_alert}</Text>
            </View>
          )}

          {cropAdvisory.soil_prep && (
            <View style={[styles.tipBox, { backgroundColor: '#f3e5f5' }]}>
              <Text style={[styles.tipLabel, { color: '#6a1b9a' }]}>🪱 {t('soil_prep')}</Text>
              <Text style={styles.tipText}>{cropAdvisory.soil_prep}</Text>
            </View>
          )}

          {cropAdvisory.market_tip && (
            <View style={[styles.tipBox, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.tipLabel, { color: '#2e7d32' }]}>💰 {t('market_tip')}</Text>
              <Text style={styles.tipText}>{cropAdvisory.market_tip}</Text>
            </View>
          )}
        </View>
      )}

      {/* Weather Advisory */}
      {advisory.length > 0 && (
        <View style={styles.advisoryCard}>
          <Text style={styles.advisoryTitle}>⚠️ {t('crop_weather_advisory')}</Text>
          {advisory.map((adv, i) => (
            <Text key={i} style={styles.advisoryText}>• {adv}</Text>
          ))}
        </View>
      )}

      {/* 7 Day Forecast */}
      <Text style={styles.sectionTitle}>{t('seven_day_forecast')}</Text>
      {forecast.length > 0 ? forecast.map((day, index) => (
        <View key={index} style={[styles.forecastCard,
          index === 0 && styles.todayCard]}>
          <Text style={styles.forecastEmoji}>{getWeatherEmoji(day.description)}</Text>
          <View style={styles.forecastInfo}>
            <Text style={styles.forecastDay}>{day.day || `Day ${index + 1}`}</Text>
            <Text style={styles.forecastDesc}>{day.description}</Text>
            <Text style={styles.forecastDetails}>
              💧 {day.humidity}% | 💨 {day.wind_speed || 0} km/h
            </Text>
          </View>
          <View style={styles.forecastTemps}>
            <Text style={styles.tempMax}>{day.temp_max || day.temp}°</Text>
            <Text style={styles.tempMin}>{day.temp_min || day.temp}°</Text>
          </View>
        </View>
      )) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('no_cases')}</Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  centered: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', padding: 20
  },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorText: { color: '#c62828', fontSize: 16, textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: '#2e7d32',
    borderRadius: 10, padding: 12, paddingHorizontal: 24
  },
  retryText: { color: 'white', fontWeight: 'bold' },
  header: {
    backgroundColor: '#2e7d32', padding: 24,
    paddingTop: 50, alignItems: 'center'
  },
  headerEmoji: { fontSize: 40, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#c8e6c9', marginTop: 4 },
  headerDate: { fontSize: 13, color: '#c8e6c9', marginTop: 2 },
  currentCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 20, padding: 20, elevation: 4
  },
  currentTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16
  },
  currentLeft: { flex: 1 },
  currentTemp: { fontSize: 52, fontWeight: 'bold', color: '#2e7d32' },
  currentFeels: { fontSize: 14, color: '#888', marginTop: 2 },
  currentDesc: {
    fontSize: 16, color: '#555',
    textTransform: 'capitalize', marginTop: 4
  },
  currentMinMax: { fontSize: 14, color: '#666', marginTop: 4 },
  currentBigEmoji: { fontSize: 64 },
  currentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: {
    width: '30%', backgroundColor: '#f1f8e9',
    borderRadius: 10, padding: 10, alignItems: 'center'
  },
  gridVal: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32' },
  gridLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  cropAdvisoryCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 16, padding: 16, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: '#2e7d32'
  },
  cropAdvisoryTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#2e7d32', marginBottom: 6
  },
  cropSeason: { fontSize: 14, color: '#555', marginBottom: 10 },
  tipBox: {
    backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: 10, marginBottom: 8
  },
  tipLabel: {
    fontSize: 13, fontWeight: 'bold',
    color: '#2e7d32', marginBottom: 4
  },
  tipText: { fontSize: 13, color: '#444', lineHeight: 20 },
  cropSubLabel: {
    fontSize: 13, fontWeight: 'bold',
    color: '#333', marginBottom: 8, marginTop: 8
  },
  cropsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cropTag: {
    backgroundColor: '#e8f5e9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4
  },
  cropTagText: { color: '#2e7d32', fontSize: 12, fontWeight: '600' },
  advisoryCard: {
    margin: 16, backgroundColor: '#fff8e1',
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#f9a825'
  },
  advisoryTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#f57f17', marginBottom: 8
  },
  advisoryText: { fontSize: 13, color: '#555', marginBottom: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#333', marginHorizontal: 16,
    marginBottom: 10, marginTop: 4
  },
  forecastCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'white', borderRadius: 12,
    padding: 16, flexDirection: 'row',
    alignItems: 'center', elevation: 2
  },
  todayCard: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1.5, borderColor: '#2e7d32'
  },
  forecastEmoji: { fontSize: 32, marginRight: 12 },
  forecastInfo: { flex: 1 },
  forecastDay: { fontSize: 15, fontWeight: '700', color: '#333' },
  forecastDesc: {
    fontSize: 13, color: '#666',
    marginTop: 2, textTransform: 'capitalize'
  },
  forecastDetails: { fontSize: 11, color: '#888', marginTop: 4 },
  forecastTemps: { alignItems: 'flex-end' },
  tempMax: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32' },
  tempMin: { fontSize: 15, color: '#888', marginTop: 2 },
  emptyCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 12, padding: 24, alignItems: 'center'
  },
  emptyText: { color: '#888', fontSize: 15 }
});