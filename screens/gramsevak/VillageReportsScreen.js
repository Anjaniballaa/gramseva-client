import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

export default function VillageReportsScreen() {
  const { user, getVillage } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('health');
  const [healthCases, setHealthCases] = useState([]);
  const [cropReports, setCropReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workerNote, setWorkerNote] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const village = getVillage();
      const [healthRes, cropRes] = await Promise.all([
        api.get(`/health/cases?village=${village}`),
        api.get(`/crop/community/${village}`)
      ]);
      setHealthCases(healthRes.data.data || []);
      setCropReports(cropRes.data.data || []);
    } catch (error) {
      console.log('Reports error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const updateHealthCase = async (id, status) => {
    try {
      await api.put(`/health/cases/${id}`, {
        status,
        workerNote: workerNote[id] || ''
      });
      Alert.alert('Updated ✅', 'Case status updated');
      await fetchReports();
    } catch (error) {
      Alert.alert(t('error'), 'Could not update');
    }
  };

  const getSeverityColor = (level) => {
    if (level === 'Red') return '#c62828';
    if (level === 'Yellow') return '#f57f17';
    return '#2e7d32';
  };

  const getStatusColor = (status) => {
    if (status === 'pending') return '#f57f17';
    if (status === 'visited') return '#1565c0';
    if (status === 'resolved') return '#2e7d32';
    return '#666';
  };

  const renderHealthCase = ({ item }) => (
    <View style={styles.caseCard}>
      <TouchableOpacity onPress={() => setExpandedId(expandedId === item._id ? null : item._id)}>
        <View style={styles.caseHeader}>
          <View style={styles.caseInfo}>
            <Text style={styles.caseName}>{item.familyMemberName}</Text>
            <Text style={styles.caseUser}>👤 {item.userId?.name}</Text>
            <Text style={styles.caseSymptoms}>🤒 {item.symptoms?.join(', ')}</Text>
            <Text style={styles.caseDate}>🕐 {new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
          </View>
          <View style={styles.badgeCol}>
            <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severityLevel) }]}>
              <Text style={styles.badgeText}>{item.severityLevel}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expandedId === item._id && (
        <View style={styles.expandedSection}>
          {item.analysis && (() => {
            try {
              const a = JSON.parse(item.analysis);
              return (
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisTitle}>🤖 AI Analysis</Text>
                  {a.possible_conditions?.length > 0 && (
                    <Text style={styles.analysisText}>
                      {t('possible_conditions')}: {a.possible_conditions.join(', ')}
                    </Text>
                  )}
                  {a.immediate_action && (
                    <Text style={styles.analysisText}>Action: {a.immediate_action}</Text>
                  )}
                </View>
              );
            } catch (e) { return null; }
          })()}

          <TextInput
            style={styles.noteInput}
            placeholder="Add your note/advice for this case..."
            value={workerNote[item._id] || item.workerNote || ''}
            onChangeText={v => setWorkerNote(prev => ({ ...prev, [item._id]: v }))}
            multiline
          />

          <View style={styles.actionRow}>
            {['visited', 'advised', 'referred', 'resolved'].map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.statusBtn, { backgroundColor: getStatusColor(status) }]}
                onPress={() => updateHealthCase(item._id, status)}
              >
                <Text style={styles.statusBtnText}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderCropReport = ({ item }) => (
    <View style={styles.caseCard}>
      <View style={styles.caseHeader}>
        <View style={styles.caseInfo}>
          <Text style={styles.caseName}>{item.cropType} — {item.diseaseName}</Text>
          <Text style={styles.caseUser}>🧑‍🌾 {item.userId?.name}</Text>
          <Text style={styles.caseDate}>🕐 {new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
          {item.treatment?.prevention && (
            <Text style={styles.caseSymptoms} numberOfLines={2}>
              🛡️ {item.treatment.prevention}
            </Text>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) }]}>
          <Text style={styles.badgeText}>{item.severity}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 {t('village_reports')}</Text>
        <Text style={styles.headerSub}>📍 {getVillage()}</Text>
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'health', label: `🏥 Health (${healthCases.length})` },
          { key: 'crop', label: `🌾 ${t('crop_reports')} (${cropReports.length})` }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#bf360c" style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={activeTab === 'health' ? healthCases : cropReports}
          renderItem={activeTab === 'health' ? renderHealthCase : renderCropReport}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No {t('reports')} yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff3e0' },
  header: { backgroundColor: '#bf360c', padding: 24, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 14, color: '#ffccbc', marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: 'white', padding: 8, gap: 8, elevation: 2 },
  tab: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#f5f5f5' },
  activeTab: { backgroundColor: '#bf360c' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: 'white' },
  caseCard: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  caseHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  caseInfo: { flex: 1, marginRight: 10 },
  caseName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  caseUser: { fontSize: 13, color: '#666', marginTop: 2 },
  caseSymptoms: { fontSize: 13, color: '#555', marginTop: 4 },
  caseDate: { fontSize: 12, color: '#888', marginTop: 4 },
  badgeCol: { alignItems: 'flex-end', gap: 6 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  analysisBox: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 10, marginBottom: 10 },
  analysisTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  analysisText: { fontSize: 13, color: '#555', marginBottom: 4 },
  noteInput: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 10
  },
  actionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusBtn: { borderRadius: 8, padding: 8, paddingHorizontal: 12 },
  statusBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  emptyCard: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#888' }
});