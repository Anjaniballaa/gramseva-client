import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  Linking, Alert
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const GREEN = '#2e7d32';

const HEALTH_CENTER_TYPES = [
  { type: 'hospital', label: '🏥 Hospitals', keyword: 'hospital' },
  { type: 'clinic', label: '🏨 Clinics', keyword: 'clinic' },
  { type: 'pharmacy', label: '💊 Pharmacy', keyword: 'pharmacy' },
  { type: 'phc', label: '🏡 PHC', keyword: 'primary health center' },
];

export default function NearbyHealthCentersScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('hospital');
  const [userCoords, setUserCoords] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    detectLocationAndFetch();
  }, []);

  useEffect(() => {
    if (userCoords) fetchNearbyCenters(activeType);
  }, [activeType, userCoords]);

  const detectLocationAndFetch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required to find nearby health centers');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const coords = {
        lat: location.coords.latitude,
        lon: location.coords.longitude
      };
      setUserCoords(coords);
      await fetchNearbyCenters('hospital', coords);
    } catch (e) {
      setError('Could not detect location: ' + e.message);
      setLoading(false);
    }
  };

  const fetchNearbyCenters = async (type, coords) => {
    setLoading(true);
    try {
      const useCoords = coords || userCoords;
      if (!useCoords) return;

      const typeInfo = HEALTH_CENTER_TYPES.find(t => t.type === type);
      const keyword = typeInfo?.keyword || 'hospital';

      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="${keyword}"](around:5000,${useCoords.lat},${useCoords.lon});
          way["amenity"="${keyword}"](around:5000,${useCoords.lat},${useCoords.lon});
          node["healthcare"="${keyword}"](around:5000,${useCoords.lat},${useCoords.lon});
          node["shop"="pharmacy"](around:5000,${useCoords.lat},${useCoords.lon});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: query,
          headers: { 'Content-Type': 'text/plain' }
        }
      );

      const data = await response.json();

      const places = data.elements
        .filter(e => e.tags?.name && e.lat && e.lon)
        .map(e => {
          const dist = getDistance(
            useCoords.lat, useCoords.lon,
            e.lat, e.lon
          );
          return {
            id: e.id.toString(),
            name: e.tags.name,
            type: e.tags.amenity || e.tags.healthcare || type,
            address: [
              e.tags['addr:street'],
              e.tags['addr:city'],
              e.tags['addr:state']
            ].filter(Boolean).join(', ') || 'Address not available',
            phone: e.tags.phone || e.tags['contact:phone'] || null,
            lat: e.lat,
            lon: e.lon,
            distance: dist,
            opening_hours: e.tags.opening_hours || null,
            emergency: e.tags.emergency || null
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);

      setCenters(places);
    } catch (e) {
      console.log('Fetch centers error:', e.message);
      setError('Could not load nearby centers');
    } finally {
      setLoading(false);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const openInMaps = (center) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lon}`;
    Linking.openURL(url);
  };

  const callCenter = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getTypeEmoji = (type) => {
    if (type?.includes('hospital')) return '🏥';
    if (type?.includes('clinic')) return '🏨';
    if (type?.includes('pharmacy')) return '💊';
    if (type?.includes('phc') || type?.includes('primary')) return '🏡';
    return '🏥';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>🏥 {t('nearby_health_centers')}</Text>
          <Text style={styles.headerSub}>{t('within_5km')}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {HEALTH_CENTER_TYPES.map(tp => (
          <TouchableOpacity
            key={tp.type}
            style={[styles.filterBtn,
              activeType === tp.type && styles.activeFilter]}
            onPress={() => setActiveType(tp.type)}
          >
            <Text style={[styles.filterText,
              activeType === tp.type && { color: 'white' }]}>
              {tp.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Emergency Numbers */}
      <View style={styles.emergencyBar}>
        <Text style={styles.emergencyLabel}>🚨 {t('emergency_services')}:</Text>
        {[
          { label: 'Ambulance', number: '108' },
          { label: 'Health', number: '104' },
        ].map((e, i) => (
          <TouchableOpacity
            key={i}
            style={styles.emergencyBtn}
            onPress={() => Linking.openURL(`tel:${e.number}`)}
          >
            <Text style={styles.emergencyBtnText}>
              📞 {e.label} {e.number}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={detectLocationAndFetch}
          >
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>{t('finding_centers')}...</Text>
        </View>
      ) : (
        <FlatList
          data={centers}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏥</Text>
              <Text style={styles.emptyTitle}>{t('no_centers')}</Text>
              <Text style={styles.emptySub}>{t('try_different')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.centerCard}>
              <View style={styles.centerHeader}>
                <Text style={styles.centerEmoji}>{getTypeEmoji(item.type)}</Text>
                <View style={styles.centerInfo}>
                  <Text style={styles.centerName}>{item.name}</Text>
                  <Text style={styles.centerAddress}>📍 {item.address}</Text>
                  <Text style={styles.centerDistance}>
                    🚗 {item.distance < 1
                      ? `${Math.round(item.distance * 1000)}m away`
                      : `${item.distance.toFixed(1)}km away`}
                  </Text>
                  {item.opening_hours && (
                    <Text style={styles.centerHours}>
                      🕐 {item.opening_hours}
                    </Text>
                  )}
                  {item.emergency === 'yes' && (
                    <View style={styles.emergencyBadge}>
                      <Text style={styles.emergencyBadgeText}>🚨 {t('emergency_services')}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.centerActions}>
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={() => openInMaps(item)}
                >
                  <Text style={styles.directionsBtnText}>🗺️ {t('directions')}</Text>
                </TouchableOpacity>
                {item.phone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => callCenter(item.phone)}
                  >
                    <Text style={styles.callBtnText}>📞 {t('call')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  header: {
    backgroundColor: GREEN, padding: 16,
    paddingTop: 50, flexDirection: 'row',
    alignItems: 'center', gap: 12
  },
  backBtn: { fontSize: 24, color: 'white', padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#c8e6c9', marginTop: 2 },
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 8, gap: 8, backgroundColor: 'white', elevation: 2
  },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  activeFilter: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 12, fontWeight: '600', color: '#555' },
  emergencyBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffebee', padding: 10,
    gap: 8, flexWrap: 'wrap'
  },
  emergencyLabel: { fontSize: 13, fontWeight: 'bold', color: '#c62828' },
  emergencyBtn: {
    backgroundColor: '#c62828', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6
  },
  emergencyBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 15 },
  errorCard: { margin: 20, alignItems: 'center' },
  errorText: { color: '#c62828', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    marginTop: 12, backgroundColor: GREEN,
    borderRadius: 10, padding: 12, paddingHorizontal: 24
  },
  retryText: { color: 'white', fontWeight: 'bold' },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8 },
  centerCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: GREEN
  },
  centerHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  centerEmoji: { fontSize: 32, marginTop: 4 },
  centerInfo: { flex: 1 },
  centerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  centerAddress: { fontSize: 13, color: '#666', marginTop: 4 },
  centerDistance: { fontSize: 13, color: GREEN, marginTop: 4, fontWeight: '600' },
  centerHours: { fontSize: 12, color: '#888', marginTop: 4 },
  emergencyBadge: {
    backgroundColor: '#ffebee', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 6
  },
  emergencyBadgeText: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
  centerActions: { flexDirection: 'row', gap: 10 },
  directionsBtn: {
    flex: 1, backgroundColor: '#e8f5e9',
    borderRadius: 10, padding: 12, alignItems: 'center'
  },
  directionsBtnText: { color: GREEN, fontWeight: 'bold', fontSize: 13 },
  callBtn: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10, padding: 12,
    paddingHorizontal: 20, alignItems: 'center'
  },
  callBtnText: { color: '#1565c0', fontWeight: 'bold', fontSize: 13 }
});