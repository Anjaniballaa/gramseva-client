import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const VIOLET = '#6a1b9a';

export default function PatientHistoryScreen({ route, navigation }) {
  const { patientId, patientName } = route.params || {};
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/chat/patient/${patientId}/history`);
      setData(res.data.data);
    } catch (error) {
      console.log('History error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (level) => {
    if (level === 'Red') return '#c62828';
    if (level === 'Yellow') return '#f57f17';
    return '#2e7d32';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={VIOLET} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📋 {t('patient_history')}</Text>
          <Text style={styles.headerSub}>{patientName}</Text>
        </View>
      </View>

      {/* Patient Info */}
      {data?.patient && (
        <View style={styles.patientCard}>
          <Text style={styles.patientName}>👤 {data.patient.name}</Text>
          <Text style={styles.patientDetail}>📱 {data.patient.phone}</Text>
          <Text style={styles.patientDetail}>📍 {data.patient.village}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: 'health', label: `🤒 ${t('check_symptoms')} (${data?.healthRecords?.length || 0})` },
          { key: 'cards', label: `🏥 ${t('health_cards')} (${data?.familyCards?.length || 0})` },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText,
              activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Health Records */}
        {activeTab === 'health' && (
          data?.healthRecords?.length > 0 ? (
            data.healthRecords.map((record, i) => {
              let analysis = {};
              try { analysis = JSON.parse(record.analysis || '{}'); } catch (e) {}

              return (
                <View key={i} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardName}>{record.familyMemberName}</Text>
                    <View style={[styles.severityBadge,
                      { backgroundColor: getSeverityColor(record.severityLevel) }]}>
                      <Text style={styles.severityText}>{record.severityLevel}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDate}>
                    🕐 {new Date(record.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.cardDetail}>
                    🤒 {record.symptoms?.join(', ')}
                  </Text>
                  {analysis.possible_conditions?.length > 0 && (
                    <Text style={styles.cardDetail}>
                      🔍 {analysis.possible_conditions.join(', ')}
                    </Text>
                  )}
                  {analysis.immediate_action && (
                    <Text style={styles.cardAdvice}>
                      ⚡ {analysis.immediate_action}
                    </Text>
                  )}
                  {record.workerNote ? (
                    <Text style={styles.workerNote}>
                      👨‍⚕️ {t('gramsevak')}: {record.workerNote}
                    </Text>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_records')}</Text>
            </View>
          )
        )}

        {/* Family Cards */}
        {activeTab === 'cards' && (
          data?.familyCards?.length > 0 ? (
            data.familyCards.map((card, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{card.memberName}</Text>
                  <View style={styles.bloodBadge}>
                    <Text style={styles.bloodText}>{card.bloodGroup}</Text>
                  </View>
                </View>
                <Text style={styles.cardDetail}>
                  👤 {card.age} yrs • {card.gender}
                </Text>
                {card.conditions?.length > 0 && (
                  <Text style={styles.cardDetail}>
                    🏥 {card.conditions.join(', ')}
                  </Text>
                )}
                {card.medications?.length > 0 && (
                  <Text style={styles.cardDetail}>
                    💊 {card.medications.join(', ')}
                  </Text>
                )}
                {card.vaccinations?.length > 0 && (
                  <Text style={styles.cardDetail}>
                    💉 {card.vaccinations.map(v => v.name).join(', ')}
                  </Text>
                )}
                {card.emergencyContact ? (
                  <Text style={styles.emergencyText}>
                    🚨 {card.emergencyName}: {card.emergencyContact}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_records')}</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3e5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: VIOLET, padding: 16,
    paddingTop: 50, flexDirection: 'row',
    alignItems: 'center', gap: 12
  },
  backBtn: { fontSize: 24, color: 'white', padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: '#ce93d8', marginTop: 2 },
  patientCard: {
    margin: 16, backgroundColor: 'white',
    borderRadius: 14, padding: 16, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: VIOLET
  },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  patientDetail: { fontSize: 13, color: '#666', marginTop: 4 },
  tabRow: {
    flexDirection: 'row', backgroundColor: 'white',
    padding: 8, gap: 8, elevation: 2
  },
  tab: {
    flex: 1, padding: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#f5f5f5'
  },
  activeTab: { backgroundColor: VIOLET },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },
  card: {
    backgroundColor: 'white', borderRadius: 14,
    padding: 14, marginBottom: 10, elevation: 2
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8
  },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  severityBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  bloodBadge: {
    backgroundColor: '#e53935', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4
  },
  bloodText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  cardDate: { fontSize: 12, color: '#888', marginBottom: 6 },
  cardDetail: { fontSize: 13, color: '#555', marginBottom: 4 },
  cardAdvice: {
    fontSize: 13, color: '#1565c0',
    marginTop: 6, fontStyle: 'italic'
  },
  workerNote: {
    fontSize: 13, color: '#2e7d32',
    marginTop: 6, fontStyle: 'italic'
  },
  emergencyText: { fontSize: 12, color: '#c62828', marginTop: 4 },
  emptyCard: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 15, color: '#888' }
});