import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { getLiveLocation } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

const RED = '#b71c1c';
const LIGHT_RED = '#ffebee';

export default function GramSevakHome({ navigation }) {
  const { user, getVillage, liveVillage } = useAuth();
  const { t } = useLanguage();
  const [locationName, setLocationName] = useState('');
  const [healthCases, setHealthCases] = useState([]);
  const [cropReports, setCropReports] = useState([]);
  const [epidemicWarning, setEpidemicWarning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    detectLocation();
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (liveVillage) {
      setLocationName(liveVillage);
      fetchDashboard();
    }
  }, [liveVillage]);

  const detectLocation = async () => {
    try {
      const location = await getLiveLocation();
      if (location?.name && location.name !== 'Unknown') {
        setLocationName(location.name);
      } else {
        setLocationName(getVillage());
      }
    } catch (e) {
      console.log('Location error:', e.message);
      setLocationName(getVillage());
    }
  };

  const fetchDashboard = async () => {
    try {
      const village = getVillage();
      const [healthRes, cropRes] = await Promise.all([
        api.get(`/health/cases?village=${village}`),
        api.get(`/crop/community/${village}`)
      ]);
      setHealthCases(healthRes.data.data || []);
      setEpidemicWarning(healthRes.data.epidemicWarning || []);
      setCropReports(cropRes.data.data || []);
    } catch (error) {
      console.log('Dashboard error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), detectLocation()]);
    setRefreshing(false);
  };

  const redCases = healthCases.filter(c => c.severityLevel === 'Red').length;
  const yellowCases = healthCases.filter(c => c.severityLevel === 'Yellow').length;
  const greenCases = healthCases.filter(c => c.severityLevel === 'Green').length;
  const recentHealth = healthCases.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('namaste')}</Text>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>ग्राम सेवक • {t('gramsevak')}</Text>
          <Text style={styles.village}>
            📍 {locationName || liveVillage || getVillage() || t('detecting_location')}
          </Text>
        </View>
        <Text style={styles.headerEmoji}>👨‍⚕️</Text>
      </View>

      {epidemicWarning.length > 0 && (
        <View style={styles.epidemicCard}>
          <Text style={styles.epidemicTitle}>{t('epidemic_alert')}</Text>
          <Text style={styles.epidemicText}>
            Multiple cases: {epidemicWarning.join(', ')}
          </Text>
          <Text style={styles.epidemicSub}>{t('report_phc')}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('village_health_summary')}</Text>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: LIGHT_RED }]}>
          <Text style={[styles.summaryNum, { color: RED }]}>{redCases}</Text>
          <Text style={styles.summaryLabel}>{t('critical')}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fff8e1' }]}>
          <Text style={[styles.summaryNum, { color: '#f57f17' }]}>{yellowCases}</Text>
          <Text style={styles.summaryLabel}>{t('moderate')}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
          <Text style={[styles.summaryNum, { color: '#2e7d32' }]}>{greenCases}</Text>
          <Text style={styles.summaryLabel}>{t('mild')}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#e3f2fd' }]}>
          <Text style={[styles.summaryNum, { color: '#1565c0' }]}>{cropReports.length}</Text>
          <Text style={styles.summaryLabel}>{t('crop_reports')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: LIGHT_RED }]}
          onPress={() => navigation.navigate('Reports')}
        >
          <Text style={styles.actionEmoji}>📋</Text>
          <Text style={styles.actionLabel}>{t('village_reports')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fff3e0' }]}
          onPress={() => navigation.navigate('Epidemic')}
        >
          <Text style={styles.actionEmoji}>⚠️</Text>
          <Text style={styles.actionLabel}>{t('epidemic_alerts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#fce4ec' }]}
          onPress={() => navigation.navigate('Community')}
        >
          <Text style={styles.actionEmoji}>👥</Text>
          <Text style={styles.actionLabel}>{t('community')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#e8eaf6' }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionEmoji}>👤</Text>
          <Text style={styles.actionLabel}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('recent_health_cases')}</Text>
      {loading ? (
        <ActivityIndicator color={RED} style={{ margin: 20 }} />
      ) : recentHealth.length > 0 ? (
        recentHealth.map((c, i) => (
          <View key={i} style={styles.caseCard}>
            <View style={styles.caseHeader}>
              <Text style={styles.caseName}>{c.familyMemberName}</Text>
              <View style={[styles.severityBadge, {
                backgroundColor:
                  c.severityLevel === 'Red' ? RED :
                  c.severityLevel === 'Yellow' ? '#f57f17' : '#2e7d32'
              }]}>
                <Text style={styles.severityText}>{c.severityLevel}</Text>
              </View>
            </View>
            <Text style={styles.caseSymptoms}>🤒 {c.symptoms?.join(', ')}</Text>
            <Text style={styles.caseDate}>
              🕐 {new Date(c.createdAt).toLocaleDateString('en-IN')}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('no_cases')}</Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_RED },
  header: {
    backgroundColor: RED, padding: 24,
    paddingTop: 50, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  greeting: { fontSize: 16, color: '#ffcdd2' },
  name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  role: { fontSize: 13, color: '#ef9a9a', marginTop: 2 },
  village: { fontSize: 13, color: '#ef9a9a', marginTop: 2 },
  headerEmoji: { fontSize: 50 },
  epidemicCard: { margin: 16, backgroundColor: RED, borderRadius: 16, padding: 16 },
  epidemicTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 6 },
  epidemicText: { fontSize: 14, color: '#ffcdd2' },
  epidemicSub: { fontSize: 13, color: 'white', marginTop: 6, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#333',
    marginHorizontal: 16, marginTop: 16, marginBottom: 10
  },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  summaryNum: { fontSize: 28, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, color: '#555', marginTop: 4, textAlign: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  actionCard: { width: '47%', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 2 },
  actionEmoji: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  caseCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'white', borderRadius: 12, padding: 14, elevation: 2
  },
  caseHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6
  },
  caseName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  severityBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  caseSymptoms: { fontSize: 13, color: '#555' },
  caseDate: { fontSize: 12, color: '#888', marginTop: 4 },
  emptyCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 12, padding: 24, alignItems: 'center'
  },
  emptyText: { fontSize: 15, color: '#888' }
});