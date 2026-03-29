import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Linking
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

export default function EpidemicAlertScreen() {
  const { user, getVillage } = useAuth();
  const { t } = useLanguage();
  const [cases, setCases] = useState([]);
  const [epidemicWarning, setEpidemicWarning] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get(`/health/cases?village=${getVillage()}`);
      const allCases = res.data.data || [];
      setCases(allCases);
      setEpidemicWarning(res.data.epidemicWarning || []);

      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCases = allCases.filter(c => new Date(c.createdAt) >= last7Days);

      const symptomCount = {};
      recentCases.forEach(c => {
        c.symptoms?.forEach(s => {
          symptomCount[s] = (symptomCount[s] || 0) + 1;
        });
      });

      setStats({
        total: allCases.length,
        recent: recentCases.length,
        red: allCases.filter(c => c.severityLevel === 'Red').length,
        yellow: allCases.filter(c => c.severityLevel === 'Yellow').length,
        topSymptoms: Object.entries(symptomCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
      });
    } catch (error) {
      console.log('Epidemic error:', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚠️ {t('epidemic_alerts')}</Text>
        <Text style={styles.headerSub}>📍 {getVillage()}</Text>
      </View>

      {epidemicWarning.length > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>{t('epidemic_alert')}</Text>
          <Text style={styles.alertText}>
            5+ cases of: {epidemicWarning.join(', ')}
          </Text>
          <Text style={styles.alertSub}>{t('report_phc')}</Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL('tel:104')}
          >
            <Text style={styles.callBtnText}>{t('health_helpline')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {epidemicWarning.length === 0 && (
        <View style={styles.safeCard}>
          <Text style={styles.safeEmoji}>✅</Text>
          <Text style={styles.safeText}>No epidemic warnings</Text>
          <Text style={styles.safeSub}>Village health situation is normal</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>📊 Last 7 Days {t('reports')}</Text>
      <View style={styles.statsRow}>
        {[
          { label: 'Total Cases', value: stats.total || 0, color: '#333' },
          { label: 'This Week', value: stats.recent || 0, color: '#1565c0' },
          { label: t('critical'), value: stats.red || 0, color: '#c62828' },
          { label: t('moderate'), value: stats.yellow || 0, color: '#f57f17' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {stats.topSymptoms?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🤒 {t('select_symptoms')}</Text>
          {stats.topSymptoms.map(([symptom, count], i) => (
            <View key={i} style={styles.symptomBar}>
              <Text style={styles.symptomName}>{symptom}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, {
                  width: `${Math.min((count / (stats.recent || 1)) * 100, 100)}%`,
                  backgroundColor: count >= 5 ? '#c62828' : count >= 3 ? '#f57f17' : '#2e7d32'
                }]} />
              </View>
              <Text style={styles.symptomCount}>{count}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>📞 {t('emergency_numbers')}</Text>
      <View style={styles.contactsCard}>
        {[
          { label: '🏥 PHC/Health Center', number: '104' },
          { label: '🚑 Ambulance', number: '108' },
          { label: '🦟 Malaria Helpline', number: '1800-11-8181' },
          { label: '💊 Medicine Helpline', number: '1800-180-1104' },
        ].map((c, i) => (
          <TouchableOpacity
            key={i}
            style={styles.contactRow}
            onPress={() => Linking.openURL(`tel:${c.number}`)}
          >
            <Text style={styles.contactLabel}>{c.label}</Text>
            <Text style={styles.contactNumber}>{c.number}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff3e0' },
  header: { backgroundColor: '#bf360c', padding: 24, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#ffccbc', marginTop: 4 },
  alertCard: { margin: 16, backgroundColor: '#c62828', borderRadius: 16, padding: 20 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  alertText: { fontSize: 15, color: '#ffcdd2', marginBottom: 6 },
  alertSub: { fontSize: 14, color: 'white', marginBottom: 12 },
  callBtn: { backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center' },
  callBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 15 },
  safeCard: {
    margin: 16, backgroundColor: '#e8f5e9',
    borderRadius: 16, padding: 24, alignItems: 'center'
  },
  safeEmoji: { fontSize: 48, marginBottom: 8 },
  safeText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  safeSub: { fontSize: 14, color: '#555', marginTop: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#333',
    marginHorizontal: 16, marginTop: 16, marginBottom: 10
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, flexWrap: 'wrap' },
  statCard: {
    width: '47%', backgroundColor: 'white',
    borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2, marginBottom: 8
  },
  statNum: { fontSize: 32, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  symptomBar: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'white', borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 1
  },
  symptomName: { fontSize: 13, color: '#333', width: 120 },
  barContainer: {
    flex: 1, height: 8, backgroundColor: '#f0f0f0',
    borderRadius: 4, marginHorizontal: 8, overflow: 'hidden'
  },
  barFill: { height: '100%', borderRadius: 4 },
  symptomCount: { fontSize: 14, fontWeight: 'bold', color: '#333', width: 24 },
  contactsCard: { margin: 16, backgroundColor: 'white', borderRadius: 16, padding: 4, elevation: 2 },
  contactRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  contactLabel: { fontSize: 14, color: '#333' },
  contactNumber: { fontSize: 14, fontWeight: 'bold', color: '#1565c0' }
});